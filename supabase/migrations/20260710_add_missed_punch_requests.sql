-- Missed-punch requests.
--
-- When an employee forgets a punch (most commonly a clock-out), they submit a
-- request for the missing punch. It lands in the manager's Pending Approvals;
-- on approval the app inserts the corresponding public.time_logs row (tagged
-- via edited_by_manager) and marks the request approved. Mirrors the existing
-- early_clockin_approvals request/approval flow.

CREATE TABLE IF NOT EXISTS public.missed_punch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_name text NOT NULL,
  -- The punch the employee is asking to add.
  action text NOT NULL CHECK (action IN ('IN', 'OUT', 'START_LUNCH', 'END_LUNCH')),
  -- When the punch should have happened.
  punch_at timestamptz NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at timestamptz DEFAULT now(),
  reviewed_by text,
  site text DEFAULT 'Site 1 - Justin TX'
);

-- Managers filter the pending queue by user and status.
CREATE INDEX IF NOT EXISTS missed_punch_requests_status_idx
  ON public.missed_punch_requests (status);
CREATE INDEX IF NOT EXISTS missed_punch_requests_user_id_idx
  ON public.missed_punch_requests (user_id);

ALTER TABLE public.missed_punch_requests ENABLE ROW LEVEL SECURITY;

-- Matches the app's current anon-key access model (see docs/auth-redesign.md);
-- this table is tightened alongside the others when RLS is hardened.
CREATE POLICY "Allow all access" ON public.missed_punch_requests
  FOR ALL USING (true) WITH CHECK (true);
