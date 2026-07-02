-- Index time_logs on created_at.
--
-- The timesheet load (loadTimesheets) fetches time_logs ordered by created_at,
-- and the 30-day purge deletes rows with created_at < cutoff. Both benefit from
-- an index on created_at as the table grows. IF NOT EXISTS keeps this safe to
-- re-run.

CREATE INDEX IF NOT EXISTS idx_time_logs_created_at
  ON public.time_logs (created_at);
