-- Add a publish workflow to schedules.
--
-- A schedule can be 'pending' (a draft only managers can see and edit) or
-- 'published' (live: visible to employees and having triggered notifications).
-- Existing rows default to 'published' so nothing that is already live changes.
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

-- Guard against unexpected values.
ALTER TABLE public.schedules
  DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules
  ADD CONSTRAINT schedules_status_check CHECK (status IN ('pending', 'published'));

-- Employee-facing reads filter on status, so index it.
CREATE INDEX IF NOT EXISTS schedules_status_idx ON public.schedules (status);
