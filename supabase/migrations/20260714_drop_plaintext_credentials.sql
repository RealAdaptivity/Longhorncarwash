-- ============================================================================
-- DO NOT APPLY YET. Gated on the mobile build that uses the login + write RPCs
-- (migrations 20260711/20260712/20260713 + the matching client changes) being
-- LIVE for essentially all users.
--
-- This is the destructive step that actually closes the credential-dump hole:
-- it removes the plaintext credential columns and hides the hashes from the
-- anon/authenticated API roles. Applying it while an old client (which reads or
-- writes pin/password directly) is still in use WILL break that client.
--
-- Pre-flight checklist before running:
--   1. The RPC-based build is live on web AND mobile; old mobile is drained.
--   2. Take a fresh database backup / snapshot.
--   3. Run on a Supabase branch first and smoke-test login, punch, employee
--      creation, PIN/password change + approval, and 2FA on both clients.
-- ============================================================================

begin;

-- 1. The sync trigger references the plaintext columns; it must go before they do.
drop trigger if exists users_sync_credential_hashes on public.users;
drop function if exists public.users_sync_credential_hashes();

-- 2. Hash columns for the pending + 2FA secrets, backfilled from any in-flight
--    plaintext values so outstanding requests survive the cutover.
alter table public.users add column if not exists pending_pin_hash text;
alter table public.users add column if not exists pending_password_hash text;
alter table public.users add column if not exists two_factor_pin_hash text;

update public.users set pending_pin_hash = extensions.crypt(pending_pin, extensions.gen_salt('bf'))
  where pending_pin is not null and pending_pin <> '';
update public.users set pending_password_hash = extensions.crypt(pending_password, extensions.gen_salt('bf'))
  where pending_password is not null and pending_password <> '';
update public.users set two_factor_pin_hash = extensions.crypt(two_factor_pin, extensions.gen_salt('bf'))
  where two_factor_pin is not null and two_factor_pin <> '';

-- 3. Re-point every credential RPC at the hash columns (post-drop versions).
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
  insert into public.users (name, payroll_name, pin_hash, role, password_hash, is_approved, is_salary)
  values (
    p_name, p_payroll_name, extensions.crypt(p_pin, extensions.gen_salt('bf')),
    coalesce(p_role, 'Employee'),
    case when coalesce(p_role,'Employee') <> 'Employee' and p_password is not null and p_password <> ''
         then extensions.crypt(p_password, extensions.gen_salt('bf')) else null end,
    false, coalesce(p_is_salary, false)
  ) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_update_employee(
  p_user_id uuid, p_name text, p_payroll_name text, p_pay_rate double precision,
  p_is_salary boolean, p_role text, p_tax_status text,
  p_new_password text, p_revoke_password boolean
) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
begin
  update public.users set
    name = p_name, payroll_name = p_payroll_name, pay_rate = p_pay_rate,
    is_salary = p_is_salary, role = p_role,
    tax_status = coalesce(p_tax_status, tax_status),
    password_hash = case
      when p_revoke_password then null
      when p_new_password is not null and p_new_password <> '' then extensions.crypt(p_new_password, extensions.gen_salt('bf'))
      else password_hash end
  where id = p_user_id;
end; $$;

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
  update public.users set pending_pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')) where id = v_id;
  return 'ok';
end; $$;

create or replace function public.request_password_change(p_name text, p_new_password text)
returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_id uuid;
begin
  select id into v_id from public.users
    where name = p_name and role in ('Admin','Site Manager','Assistant Site Manager','Manager','Supervisor','Payroll')
    limit 1;
  if v_id is null then return false; end if;
  update public.users set pending_password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')) where id = v_id;
  return true;
end; $$;

create or replace function public.approve_pin_change(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.users set pin_hash = pending_pin_hash, pending_pin_hash = null
    where id = p_user_id and pending_pin_hash is not null;
end; $$;

create or replace function public.approve_password_change(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.users set password_hash = pending_password_hash, pending_password_hash = null
    where id = p_user_id and pending_password_hash is not null;
end; $$;

create or replace function public.reject_pin_change(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin update public.users set pending_pin_hash = null where id = p_user_id; end; $$;

create or replace function public.reject_password_change(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin update public.users set pending_password_hash = null where id = p_user_id; end; $$;

create or replace function public.set_2fa(p_user_id uuid, p_enabled boolean, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  update public.users
    set two_factor_enabled = p_enabled,
        two_factor_pin_hash = case when p_enabled then extensions.crypt(p_pin, extensions.gen_salt('bf')) else null end
    where id = p_user_id;
end; $$;

create or replace function public.verify_manager_2fa(p_user_id uuid, p_pin text)
returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.users u
    where u.id = p_user_id
      and u.two_factor_pin_hash is not null
      and u.two_factor_pin_hash = extensions.crypt(p_pin, u.two_factor_pin_hash)
  );
$$;

create or replace function public.list_pending_approvals()
returns table (id uuid, name text, avatar text, kind text)
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select u.id, u.name, u.avatar, 'registration'::text from public.users u where u.is_approved = false
  union all
  select u.id, u.name, u.avatar, 'pin_change'::text from public.users u where u.pending_pin_hash is not null
  union all
  select u.id, u.name, u.avatar, 'password_change'::text from public.users u where u.pending_password_hash is not null;
$$;

-- 4. Drop the plaintext credential columns. (Dropping `pin` also drops its
--    UNIQUE constraint; PIN uniqueness is now enforced by pin_available() at
--    request time — bcrypt salting makes a unique index on the hash impossible.)
alter table public.users
  drop column if exists pin,
  drop column if exists password,
  drop column if exists pending_pin,
  drop column if exists pending_password,
  drop column if exists two_factor_pin;

-- 5. Hide the hashes from the API roles. SECURITY DEFINER RPCs still read them
--    (they run as the owner); ordinary client reads select only non-secret
--    columns, so they are unaffected. This is what stops an anon caller from
--    dumping the hashes (a bcrypt of a 4-digit PIN is trivially brute-forced).
revoke select (pin_hash, password_hash, pending_pin_hash, pending_password_hash, two_factor_pin_hash)
  on public.users from anon, authenticated;

commit;
