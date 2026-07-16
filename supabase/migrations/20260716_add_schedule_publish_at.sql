-- Scheduled schedule posts.
--
-- A schedule can be created with a future publish_at so it stays visible to
-- managers only until that moment, then automatically goes live for everyone.
--
--   * publish_at IS NULL              -> live immediately (existing behavior)
--   * publish_at > now()             -> "scheduled": managers-only until it passes
--   * publish_at <= now()            -> live for everyone
--
-- notified tracks whether the go-live push notification has been sent, so the
-- scheduled job below fires it exactly once. Existing rows and immediate posts
-- are marked notified = true (their notification is sent client-side at post
-- time); only future scheduled posts are inserted with notified = false.

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified boolean NOT NULL DEFAULT true;

-- Find scheduled posts whose publish_at has passed but that have not yet had
-- their go-live notification sent, notify the listed employees once, and mark
-- them notified. Reuses the existing send_schedule_notifications RPC.
CREATE OR REPLACE FUNCTION public.notify_due_schedules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  names text[];
  wk text;
  cnt integer := 0;
BEGIN
  FOR r IN
    SELECT id, content
    FROM public.schedules
    WHERE notified = false
      AND publish_at IS NOT NULL
      AND publish_at <= now()
  LOOP
    BEGIN
      names := ARRAY(
        SELECT jsonb_array_elements(r.content::jsonb -> 'rows') ->> 'employee'
      );
      wk := COALESCE(r.content::jsonb ->> 'weekRange', 'Weekly Schedule');
      PERFORM public.send_schedule_notifications(names, wk);
    EXCEPTION WHEN OTHERS THEN
      -- Malformed content should not wedge the loop; still mark it notified so
      -- it goes live without repeatedly erroring.
      NULL;
    END;
    UPDATE public.schedules SET notified = true WHERE id = r.id;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- This job is a trigger surface only; keep it off the public REST API.
REVOKE EXECUTE ON FUNCTION public.notify_due_schedules() FROM PUBLIC, anon, authenticated;

-- Run the job every 5 minutes when pg_cron is available. If pg_cron is not
-- installed the schedule simply isn't created — scheduled posts still go live
-- visibly on their own (the app gates visibility by publish_at); only the
-- automatic push at go-live depends on this job. "Post Now" always notifies
-- immediately regardless.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'notify-due-schedules',
      '*/5 * * * *',
      'SELECT public.notify_due_schedules();'
    );
  END IF;
END $$;
