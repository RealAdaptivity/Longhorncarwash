-- Security hardening: pin an explicit search_path on the SECURITY DEFINER
-- notification functions. Without this, a SECURITY DEFINER function inherits the
-- caller's search_path, which lets a caller shadow the referenced objects
-- (e.g. `users`, `http_post`) with their own and have the function execute
-- attacker-controlled code as the function owner.
--
-- These functions only reference objects in the `public` schema (the `users`
-- table and the `http` extension's `http_post`), so `public, pg_temp` is
-- sufficient and non-breaking.
--
-- NOTE: this does NOT change who can execute these functions. They remain
-- callable by the `anon` role because the web client invokes them with the
-- public anon key. Restricting that safely requires moving the send path behind
-- an authenticated boundary (see the RLS/auth remediation plan) and is
-- intentionally out of scope for this hardening migration.

ALTER FUNCTION public.send_push_notification(text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.send_push_notification(text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.send_schedule_notifications(text[], text)
  SET search_path = public, pg_temp;
