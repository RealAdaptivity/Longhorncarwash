# Security remediation — Phase 1 status

Implements Phase 1 of the RLS/auth/credential remediation plan: move credential
verification server-side and stop shipping secrets to clients. This branch is
**additive and non-breaking** — it does not drop plaintext columns or change RLS.

## What shipped

### Database (applied to project `pbgatghmutejbsmcedsw`)
- **`20260711_hash_credentials_and_login_rpcs.sql`**
  - `pin_hash` / `password_hash` columns on `public.users` (bcrypt via `pgcrypto`).
  - `users_sync_credential_hashes` BEFORE INSERT/UPDATE trigger that rehashes
    whenever `pin` / `password` change, so every existing write path (employee
    creation, PIN/password change, `pending_pin` approval, 2FA setup) keeps
    working with no code change.
  - Backfill of existing rows.
  - SECURITY DEFINER RPCs, `search_path` pinned, EXECUTE granted to
    `anon`/`authenticated` only: `authenticate_pin`, `authenticate_manager`
    (returns profile + `two_factor_enabled`, **not** `two_factor_pin`),
    `verify_manager_2fa`, `pin_available`.
- **`20260712_employee_portal_auth_rpc.sql`**
  - `authenticate_employee(name, pin)` for the "My Hours" portal login.

### Web client
- `modules/timeclock.js` — PIN login → `authenticate_pin`; forgot-PIN uniqueness → `pin_available`.
- `modules/manager.js` — `attemptManagerLogin` → `authenticate_manager` (role/approval checks kept client-side); 2FA verify → `verify_manager_2fa`; create-employee PIN uniqueness → `pin_available`.
- `modules/employee.js` — portal login → `authenticate_employee`.
- 2FA settings no longer receive `two_factor_pin`; the setup field simply starts blank (save validation unchanged).

### Mobile client (`mobile/src/context/AuthContext.tsx`)
- `login()` → `authenticate_pin`; `unlockManager()` → `authenticate_manager`.
- **Takes effect only on the next mobile build/release.** Until then the current
  build keeps authenticating via the plaintext columns — which is why those
  columns and the open RLS must remain in place for now.

## Verified
- Backfill: 8/8 PINs and 4/4 passwords hashed.
- Every existing plaintext PIN/password authenticates to its own row via the RPCs.
- `pin_available` returns false for in-use PINs, true otherwise.
- Trigger rehashes correctly on INSERT and on PIN update (checked in a rolled-back tx).
- `node --test` (web) passes; web modules pass `node --check`.

## NOT done yet (gated follow-up — do NOT ship without these prerequisites)
These are the steps that actually remove the exposure, and they are destructive
and client-breaking, so they must wait:
1. **Ship the mobile build** wired to the RPCs, and confirm web + mobile login work in production.
2. Only then: drop the plaintext `pin`, `password`, `pending_pin`, `pending_password`, `two_factor_pin` columns (redesign the manager approval UI, which currently displays `pending_pin` / `pending_password`, to approve without echoing the secret).
3. Replace the blanket `anon_access` `USING(true) WITH CHECK(true)` RLS policies with least-privilege policies (Phase 2 of the plan), and revoke `anon` EXECUTE on the push RPCs once sending is behind an authenticated boundary (Phase 3).

Until steps 1–3 land, the anon key still has broad read/write access; Phase 1 is
the groundwork that makes them possible.
