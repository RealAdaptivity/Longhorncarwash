-- Rename existing Manager role to Site Manager
UPDATE public.users SET role = 'Site Manager' WHERE role = 'Manager';

-- Update password field: set it for all management roles (it was only set for Manager before)
-- Existing Assistant Site Manager and Supervisor accounts won't have passwords yet —
-- they'll need to be set when those accounts are created going forward.

-- Optional: add a check constraint to enforce valid roles
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('Employee', 'Supervisor', 'Assistant Site Manager', 'Site Manager', 'Manager', 'Admin', 'Payroll'));
