-- Phase 1 of the security remediation plan (docs/security-remediation-plan.md):
-- move credential verification server-side and stop shipping secrets to clients.
--
-- This migration is intentionally ADDITIVE and non-breaking:
--   * It adds hashed credential columns and keeps them in sync with the existing
--     plaintext columns via a trigger, so every current write path (employee
--     creation, PIN/password changes, pending_pin approval, 2FA setup) keeps
--     working untouched.
--   * It adds SECURITY DEFINER RPCs that verify credentials against the hashes
--     and return only non-secret profile fields.
--
-- It deliberately does NOT drop the plaintext columns or tighten RLS yet. The
-- currently-released mobile app authenticates by selecting pin/password
-- directly, so removing those columns would break it until a new build ships.
-- Dropping plaintext + restricting reads is a separate, gated follow-up.

create extension if not exists pgcrypto with schema extensions;

-- 1. Hashed credential columns -------------------------------------------------
alter table public.users add column if not exists pin_hash text;
alter table public.users add column if not exists password_hash text;

-- 2. Keep the hashes in sync with the plaintext columns during the transition.
--    Rehash only when the plaintext value actually changes so unrelated updates
--    stay cheap. When a plaintext value is cleared, clear its hash too.
create or replace function public.users_sync_credential_hashes()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.pin is distinct from old.pin then
    new.pin_hash := case
      when new.pin is null or new.pin = '' then null
      else extensions.crypt(new.pin, extensions.gen_salt('bf'))
    end;
  end if;

  if tg_op = 'INSERT' or new.password is distinct from old.password then
    new.password_hash := case
      when new.password is null or new.password = '' then null
      else extensions.crypt(new.password, extensions.gen_salt('bf'))
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists users_sync_credential_hashes on public.users;
create trigger users_sync_credential_hashes
  before insert or update on public.users
  for each row execute function public.users_sync_credential_hashes();

-- 3. Backfill existing rows. The plaintext columns are untouched, so the trigger
--    (which only fires on a pin/password change) does not interfere.
update public.users
  set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf'))
  where pin is not null and pin <> '';
update public.users
  set password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
  where password is not null and password <> '';

-- 4. Server-side login RPCs ----------------------------------------------------
-- Each verifies against the hash and returns only non-secret fields. Role and
-- approval checks stay in the clients (they differ per platform); these
-- functions perform the part that must not happen client-side: the secret
-- comparison. Callers still cannot read the hashes themselves.

create or replace function public.authenticate_pin(p_pin text)
returns table (id uuid, name text, role text, is_approved boolean, is_salary boolean)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select u.id, u.name, u.role, u.is_approved, u.is_salary
  from public.users u
  where u.pin_hash is not null
    and u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
  limit 1;
$$;

create or replace function public.authenticate_manager(p_name text, p_password text)
returns table (id uuid, name text, role text, is_approved boolean, two_factor_enabled boolean)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select u.id, u.name, u.role, u.is_approved, u.two_factor_enabled
  from public.users u
  where u.name = p_name
    and u.password_hash is not null
    and u.password_hash = extensions.crypt(p_password, u.password_hash)
  limit 1;
$$;

-- Server-side 2FA check so the two_factor_pin never reaches the client.
create or replace function public.verify_manager_2fa(p_name text, p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.users u
    where u.name = p_name
      and u.two_factor_pin is not null
      and u.two_factor_pin = p_pin
  );
$$;

-- PIN uniqueness check for the "forgot PIN" flow, so the client no longer needs
-- to query users by plaintext pin.
create or replace function public.pin_available(p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select not exists (
    select 1 from public.users u
    where u.pin_hash is not null
      and u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
  );
$$;

-- 5. Grants: callable by the app's anon/authenticated roles only.
revoke execute on function public.authenticate_pin(text) from public;
revoke execute on function public.authenticate_manager(text, text) from public;
revoke execute on function public.verify_manager_2fa(text, text) from public;
revoke execute on function public.pin_available(text) from public;

grant execute on function public.authenticate_pin(text) to anon, authenticated;
grant execute on function public.authenticate_manager(text, text) to anon, authenticated;
grant execute on function public.verify_manager_2fa(text, text) to anon, authenticated;
grant execute on function public.pin_available(text) to anon, authenticated;
