# Security remediation — Phase 1 + credential-hole closing

Moves ALL credential verification and writes server-side so plaintext PINs /
passwords / 2FA PINs never travel to (or from) the web or mobile clients, and
prepares the destructive step that removes the columns and hides the hashes.

Ships as **one bundle in a single mobile release**, then a gated DB migration.

## Applied to the DB now (additive, non-breaking)
- `20260711_hash_credentials_and_login_rpcs.sql` — bcrypt `pin_hash`/`password_hash`, a sync trigger, backfill, and login RPCs (`authenticate_pin`, `authenticate_manager`, `verify_manager_2fa`, `pin_available`).
- `20260712_employee_portal_auth_rpc.sql` — `authenticate_employee` for the "My Hours" portal.
- `20260713_credential_write_rpcs.sql` — every credential **write** + the approvals list, as SECURITY DEFINER RPCs: `list_pending_approvals`, `admin_create_employee`, `admin_update_employee`, `request_pin_change`, `request_password_change`, `approve_pin_change`, `approve_password_change`, `reject_pin_change`, `reject_password_change`, `set_2fa`, `approve_registration`, `reject_registration`. Transition versions write the plaintext columns (the trigger hashes them) so the not-yet-updated mobile build keeps working.

## Client changes (this PR)
**Web** — login/2FA (`timeclock.js`, `manager.js`, `employee.js`), and now all writes:
- Create/edit employee → `admin_create_employee` / `admin_update_employee`.
- Approvals list → `list_pending_approvals` (no secret values); Approve/Reject → the `approve_*`/`reject_*` RPCs (this also fixes a latent bug where PIN-change requests never appeared in the web approvals table).
- Forgot-PIN → `request_pin_change`; manager password reset → `request_password_change`; 2FA save → `set_2fa`.

**Mobile** (`AuthContext.tsx`, `EmployeesScreen.tsx`) — login + manager unlock via RPCs; approvals list/approve/deny via RPCs (and mobile can now approve registrations + PIN changes too).

## Staged, NOT applied
- `20260714_drop_plaintext_credentials.sql` — drops the sync trigger, re-points every RPC at hash columns (incl. `pending_*_hash`, `two_factor_pin_hash`), **drops the plaintext `pin`/`password`/`pending_*`/`two_factor_pin` columns**, and column-level `REVOKE SELECT` of the hash columns from `anon`/`authenticated`. This is the step that closes the exposure.

## Deployment order (must be followed)
1. Merge this PR (web deploys immediately; safe — RPCs already exist).
2. Cut a **mobile release** with these changes; wait until the old build is drained.
3. Only then apply `20260714_...` (snapshot + Supabase-branch smoke test first).

Applied out of order it breaks the old clients; in order it breaks nothing.

## Verified
- All login + write RPCs exercised in rolled-back transactions on the live DB: create→login, PIN change request→approve→login with new PIN, duplicate-PIN rejection, 2FA set/verify, password revoke on demotion. No test rows persisted.
- `node --test` passes; web modules pass `node --check`. Mobile TS typechecks in CI.

## Still out of scope (later phases)
- Authorization on the admin_*/approve_* RPCs (currently anon-callable, matching today's trust model) — belongs to the real-identity RLS phase (Phase 2).
- Least-privilege RLS on the operational tables (`time_logs`, `schedules`, …), and moving push sending behind an authenticated boundary (Phase 3).
