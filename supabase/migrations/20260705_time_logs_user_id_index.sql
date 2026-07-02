-- Index time_logs on user_id.
--
-- Covers the time_logs_user_id_fkey foreign key (Supabase advisor 0001,
-- unindexed foreign keys) and speeds up per-user log lookups. IF NOT EXISTS
-- keeps this safe to re-run.

CREATE INDEX IF NOT EXISTS idx_time_logs_user_id
  ON public.time_logs (user_id);
