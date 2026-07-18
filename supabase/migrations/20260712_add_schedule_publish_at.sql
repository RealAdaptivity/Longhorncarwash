-- Scheduled auto-publish for draft schedules.
--
-- A pending draft may carry an optional publish_at timestamp. A pg_cron job
-- flips any draft whose publish_at has passed to 'published' and fires the
-- same employee notifications a manual publish would.
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

CREATE OR REPLACE FUNCTION public.publish_due_schedules()
RETURNS integer AS $$
DECLARE
  sched RECORD;
  week_range text;
  employee_names text[];
  published_count integer := 0;
BEGIN
  FOR sched IN
    SELECT id, content
    FROM public.schedules
    WHERE status = 'pending'
      AND publish_at IS NOT NULL
      AND publish_at <= now()
  LOOP
    UPDATE public.schedules SET status = 'published' WHERE id = sched.id;
    published_count := published_count + 1;

    -- Pull the week label and scheduled employees out of the JSON content so
    -- the notification names match the manual-publish path.
    BEGIN
      week_range := coalesce((sched.content)::json->>'weekRange', '');
      SELECT array_agg(r->>'employee')
        INTO employee_names
        FROM json_array_elements((sched.content)::json->'rows') AS r;
    EXCEPTION WHEN others THEN
      week_range := '';
      employee_names := ARRAY[]::text[];
    END;

    IF employee_names IS NOT NULL AND array_length(employee_names, 1) > 0 THEN
      PERFORM public.send_schedule_notifications(employee_names, week_range);
    END IF;
  END LOOP;

  RETURN published_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Only the scheduler (table owner) should run the bulk publisher, not clients.
REVOKE EXECUTE ON FUNCTION public.publish_due_schedules() FROM PUBLIC, anon, authenticated;

-- Run every 5 minutes, matching the cadence of the other maintenance jobs.
-- Named so re-applying this migration updates rather than duplicates the job.
SELECT cron.schedule('publish-due-schedules', '*/5 * * * *', $cron$SELECT public.publish_due_schedules();$cron$);
