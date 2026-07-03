-- Follow-up hardening from the PR #51 self-review.
--
-- 1. verify_manager_2fa keyed on user id instead of name. The 2FA step already
--    knows the exact authenticated user (the client passes its id), so matching
--    by name risked validating against a different same-named account's PIN.
-- 2. Serialize the PIN-uniqueness check-then-write in admin_create_employee and
--    request_pin_change with a transaction advisory lock, so two concurrent
--    creates can't both pass pin_available() and insert the same PIN.
--
-- Transition versions (still operate on the plaintext columns via the sync
-- trigger); the staged 20260714 migration carries the hash-column equivalents.

-- 1. 2FA by id (replaces the name-keyed signature) ---------------------------
drop function if exists public.verify_manager_2fa(text, text);

create or replace function public.verify_manager_2fa(p_user_id uuid, p_pin text)
returns boolean
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.users u
    where u.id = p_user_id
      and u.two_factor_pin is not null
      and u.two_factor_pin = p_pin
  );
$$;

revoke execute on function public.verify_manager_2fa(uuid, text) from public;
grant execute on function public.verify_manager_2fa(uuid, text) to anon, authenticated;

-- 2. Advisory lock around PIN uniqueness -------------------------------------
create or replace function public.admin_create_employee(
  p_name text, p_payroll_name text, p_pin text, p_role text,
  p_password text, p_is_salary boolean
) returns uuid
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('lcw_pin_uniqueness'));
  if not public.pin_available(p_pin) then
    raise exception 'PIN is already in use' using errcode = 'unique_violation';
  end if;
  insert into public.users (name, payroll_name, pin, role, password, is_approved, is_salary)
  values (
    p_name, p_payroll_name, p_pin, coalesce(p_role, 'Employee'),
    case when coalesce(p_role,'Employee') <> 'Employee' then p_password else null end,
    false, coalesce(p_is_salary, false)
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.request_pin_change(p_name text, p_new_pin text)
returns text
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('lcw_pin_uniqueness'));
  select id into v_id from public.users where name = p_name limit 1;
  if v_id is null then return 'not_found'; end if;
  if not public.pin_available(p_new_pin) then return 'in_use'; end if;
  update public.users set pending_pin = p_new_pin where id = v_id;
  return 'ok';
end;
$$;
