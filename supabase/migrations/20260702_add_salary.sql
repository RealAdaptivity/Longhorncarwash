-- Add is_salary flag to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_salary boolean DEFAULT false;
