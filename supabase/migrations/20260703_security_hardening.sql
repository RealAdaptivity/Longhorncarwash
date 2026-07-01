-- Phase 0 security hardening (non-breaking).
--
-- Addresses Supabase database-linter findings on the punch-notification
-- trigger function, without changing any application behavior:
--   * 0011 function_search_path_mutable
--   * 0028 anon_security_definer_function_executable
--   * 0029 authenticated_security_definer_function_executable
--
-- notify_telegram_on_punch is a SECURITY DEFINER *trigger* function. Every call
-- in its body is either schema-qualified (net.http_post) or a pg_catalog
-- builtin, so pinning an empty search_path is safe and closes the mutable-path
-- privilege-escalation vector. As a trigger it never needs to be invoked
-- directly, so EXECUTE is revoked to remove its exposure via /rest/v1/rpc.

ALTER FUNCTION public.notify_telegram_on_punch() SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.notify_telegram_on_punch() FROM PUBLIC, anon, authenticated;

-- Note: the `pg_net` extension living in the `public` schema (finding 0014) is
-- intentionally NOT changed here — this function depends on it and relocating
-- the extension is higher-risk. Handle that as a separate, deliberate change.
