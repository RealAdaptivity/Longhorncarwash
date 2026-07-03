-- Phase 1 (cont.): server-side RPCs for every credential *write* and for the
-- manager approvals list, so clients no longer read or write the plaintext
-- credential columns directly. This is the prerequisite for dropping those
-- columns (see 20260714_drop_plaintext_credentials.sql, which is NOT applied
-- until the mobile build using these RPCs is live).
--
-- TRANSITION BEHAVIOR: these functions still write the plaintext columns, which
-- the existing users_sync_credential_hashes trigger hashes into pin_hash/
-- password_hash. That keeps the currently-released mobile build (which logs in
-- by reading the plaintext pin/password) working during rollout. The follow-up
-- destructive migration rewrites these same functions to write the hash columns
-- directly once the plaintext columns are gone.
--
-- AUTHORIZATION NOTE: these are granted to anon/authenticated to match the app's
-- current trust model (the anon key can already write these tables under the
-- open RLS). Restricting who may call the admin_* / approve_* functions is part
-- of the later least-privilege RLS phase, not this change.

-- Manager approvals list — one row per pending item, with NO secret values.
create or replace function public.list_pending_approvals()
returns table (id uuid, name text, avatar text, kind text)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select u.id, u.name, u.avatar, 'registration'::text as kind
    from public.users u where u.is_approved = false
  union all
  select u.id, u.name, u.avatar, 'pin_change'::text
    from public.users u where u.pending_pin is not null and u.pending_pin <> ''
  union all
  select u.id, u.name, u.avatar, 'password_change'::text
    from public.users u where u.pending_password is not null and u.pending_password <> '';
$$;

-- Create a new employee (pending approval). Rejects duplicate PINs.
create or replace function public.admin_create_employee(
  p_name text, p_payroll_name text, p_pin text, p_role text,
  p_password text, p_is_salary boolean
) returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_id uuid;
begin
  if not public.pin_available(p_pin) then
    raise exception 'PIN is already in use' using errcode = 'unique_violation';
  end if;
  insert into public.users (name, payroll_name, pin, role, password, is_approved, is_salary)
  values (
    p_name, p_payroll_name, p_pin, coalesce(p_role, 'Employee'),
    case when coalesce(p_role,'Employee') <> 'Employee' then p_password else null end,
    false, coalesce(p_is_salary, false)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Update an employee's editable fields. Password handling:
--   p_revoke_password = true  -> clear the dashboard password (demotion)
--   p_new_password non-empty  -> set/replace it
--   otherwise                 -> leave it unchanged
create or replace function public.admin_update_employee(
  p_user_id uuid, p_name text, p_payroll_name text, p_pay_rate double precision,
  p_is_salary boolean, p_role text, p_tax_status text,
  p_new_password text, p_revoke_password boolean
) returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  update public.users set
    name = p_name,
    payroll_name = p_payroll_name,
    pay_rate = p_pay_rate,
    is_salary = p_is_salary,
    role = p_role,
    tax_status = coalesce(p_tax_status, tax_status),
    password = case
      when p_revoke_password then null
      when p_new_password is not null and p_new_password <> '' then p_new_password
      else password
    end
  where id = p_user_id;
end;
$$;

-- Employee "forgot PIN": records a pending PIN change after a uniqueness check.
-- Returns 'ok' | 'not_found' | 'in_use'.
create or replace function public.request_pin_change(p_name text, p_new_pin text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id from public.users where name = p_name limit 1;
  if v_id is null then return 'not_found'; end if;
  if not public.pin_available(p_new_pin) then return 'in_use'; end if;
  update public.users set pending_pin = p_new_pin where id = v_id;
  return 'ok';
end;
$$;

-- Manager "forgot password": records a pending password change for a management
-- account (another manager approves). Returns true if the account was found.
create or replace function public.request_password_change(p_name text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id from public.users
    where name = p_name and role in ('Admin','Site Manager','Assistant Site Manager','Manager','Supervisor','Payroll')
    limit 1;
  if v_id is null then return false; end if;
  update public.users set pending_password = p_new_password where id = v_id;
  return true;
end;
$$;

-- Approvals / rejections — the pending value is promoted server-side; the client
-- never sees it.
create or replace function public.approve_pin_change(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  update public.users set pin = pending_pin, pending_pin = null
    where id = p_user_id and pending_pin is not null;
end; $$;

create or replace function public.approve_password_change(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  update public.users set password = pending_password, pending_password = null
    where id = p_user_id and pending_password is not null;
end; $$;

create or replace function public.reject_pin_change(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  update public.users set pending_pin = null where id = p_user_id;
end; $$;

create or replace function public.reject_password_change(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  update public.users set pending_password = null where id = p_user_id;
end; $$;

create or replace function public.set_2fa(p_user_id uuid, p_enabled boolean, p_pin text)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  update public.users
    set two_factor_enabled = p_enabled,
        two_factor_pin = case when p_enabled then p_pin else null end
    where id = p_user_id;
end; $$;

create or replace function public.approve_registration(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  update public.users set is_approved = true where id = p_user_id;
end; $$;

create or replace function public.reject_registration(p_user_id uuid)
returns void language plpgsql security definer
set search_path = public, extensions, pg_temp as $$
begin
  delete from public.users where id = p_user_id and is_approved = false;
end; $$;

-- Grants (match current anon/authenticated access; authZ tightening is a later phase).
do $$
declare fn text;
begin
  foreach fn in array array[
    'list_pending_approvals()',
    'admin_create_employee(text,text,text,text,text,boolean)',
    'admin_update_employee(uuid,text,text,double precision,boolean,text,text,text,boolean)',
    'request_pin_change(text,text)',
    'request_password_change(text,text)',
    'approve_pin_change(uuid)',
    'approve_password_change(uuid)',
    'reject_pin_change(uuid)',
    'reject_password_change(uuid)',
    'set_2fa(uuid,boolean,text)',
    'approve_registration(uuid)',
    'reject_registration(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public', fn);
    execute format('grant execute on function public.%s to anon, authenticated', fn);
  end loop;
end $$;
