-- Phase 1 (cont.): the employee "My Hours" portal logs in with name + PIN and
-- previously selected the row by plaintext pin. Add a server-side verifier that
-- returns only the portal profile fields, so the client stops matching on the
-- plaintext credential.

create or replace function public.authenticate_employee(p_name text, p_pin text)
returns table (id uuid, name text, pay_rate double precision, is_salary boolean, tax_status text)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select u.id, u.name, u.pay_rate, u.is_salary, u.tax_status
  from public.users u
  where u.name = p_name
    and u.pin_hash is not null
    and u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
  limit 1;
$$;

revoke execute on function public.authenticate_employee(text, text) from public;
grant execute on function public.authenticate_employee(text, text) to anon, authenticated;
