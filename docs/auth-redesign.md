# Auth Redesign Plan

Status: **proposed** — no database or client changes have been applied. This
document is the plan; each phase ships separately behind review.

## Background — the current model

Authentication today is entirely client-side and backed by anon-readable data:

- **Employee login:** `users.select(...).eq('pin', <4-digit>)` using the anon key.
- **Manager login:** `attemptManagerLogin(username, password)` →
  `users.eq('name', u).eq('password', p)`; 2FA compares a `two_factor_pin`
  fetched to the client.
- **Credentials** (`pin`, `password`, `two_factor_pin`, `pending_password`) are
  stored in **plaintext** in `public.users`.
- **Roles:** `Employee, Supervisor, Assistant Site Manager, Site Manager,
  Manager, Admin, Payroll` (enforced by a check constraint).
- **RLS:** enabled on every table, but an `anon_access` policy for `ALL` with
  `USING (true) WITH CHECK (true)` neutralizes it.

Because the anon key is public (it ships in `supabaseConfig.js` and to every
browser), the net effect is: **anyone can read and write every row, and read
every credential.** Authentication is decorative.

Supabase security-advisor findings that motivate this work:

- `rls_policy_always_true` on `users`, `time_logs`, `settings`, `schedules`,
  `shift_swaps`, `time_off_requests`, `daily_revenue`, `site_logs`,
  `checklists`, `checklist_completions`, `early_clockin_approvals` — anon
  `ALL USING(true)`.
- `function_search_path_mutable` + `anon/authenticated_security_definer_function_executable`
  on `notify_telegram_on_punch`.
- `extension_in_public` for `pg_net`.

## Target architecture

Keep the PIN/password UX, but move verification server-side and make every
request authenticated:

1. **Auth edge function** (`supabase/functions/auth-login`) verifies credentials
   against **hashed** values using the service-role key, then mints a
   Supabase-compatible JWT signed with the project JWT secret, carrying claims:
   `sub = user_id`, `role = authenticated`, and custom `app_role` / `user_id`.
2. **Client** exchanges PIN/password for the JWT and uses it as the session
   (`supabase.auth.setSession` / bearer). PostgREST calls now arrive as
   `authenticated` with claims.
3. **RLS policies** key off `auth.uid()` and `auth.jwt() ->> 'app_role'` instead
   of `true`.
4. **Privileged writes** (payroll runs, salary edits, user management,
   approvals) go through **service-role edge functions**, not direct table
   writes.

## Data-model changes

- Add `pin_hash`, `password_hash`, `two_factor_secret` (hashed / encrypted);
  backfill from the plaintext columns once, then **drop** `pin`, `password`,
  `two_factor_pin`, `pending_password` (password reset moves to a function).
- Hash with bcrypt/argon2 in the edge function (or `pgcrypto` server-side).
- Add an `auth.app_role()` SQL helper that reads the JWT claim, for concise
  policies.
- Consider splitting compensation (`pay_rate`, `is_salary`, `tax_status`,
  salary) into a `user_comp` table that only Payroll/Admin can read, so salary
  can't leak through a broad `users` read policy.

## RLS target (per role)

| Table | Employee | Supervisor / Site Mgmt | Payroll / Admin |
| --- | --- | --- | --- |
| `users` | own row (no comp columns) | team read | full; comp only here |
| `time_logs` | own read; insert own punch (or via fn) | team read/edit | full |
| `schedules`, `shift_swaps`, `time_off_requests` | own + published read; request writes | manage | full |
| `settings`, `daily_revenue`, `site_logs`, `checklists*` | read where needed | manage | full |
| credentials / `Password` | none (functions only) | none | none |

## Staged rollout (the live app never goes dark)

- **Phase 0 — Hardening (safe, independent):** set `search_path` on
  `notify_telegram_on_punch`, revoke anon/authenticated `EXECUTE` on it.
  Shipped as `supabase/migrations/20260703_security_hardening.sql`.
  (Moving `pg_net` out of `public` is deferred — the function depends on it and
  the move is higher-risk; do it deliberately, not as part of Phase 0.)
- **Phase 1 — Credentials:** add hash columns, backfill, deploy `auth-login`.
  Leave the permissive anon policies in place (dual-run) — no client change yet,
  so nothing breaks.
- **Phase 2 — Authenticated client:** client obtains and sends the JWT; add the
  new per-role RLS policies **alongside** the permissive ones. Verify every
  screen works authenticated.
- **Phase 3 — Tighten:** remove the `anon_access USING(true)` policies table by
  table (start with `users` / `time_logs`), exercising the app after each; keep
  anon `SELECT` only where genuinely public. Each step is a one-line
  `DROP POLICY` rollback.
- **Phase 4 — Privileged writes server-side:** payroll / salary /
  user-management / approvals move to service-role functions; drop the plaintext
  credential columns.
- **Phase 5 — Rotate:** rotate the anon key and the hardcoded Telegram
  bot token / webhook secret.

## Effort & risk

- Phase 0: hours. Phases 1–2: the bulk (edge function + hashing + client session
  wiring + policy authoring). Phases 3–4: incremental and test-heavy.
- Highest-risk step is Phase 3 (removing permissive policies) — done
  table-by-table with the app exercised after each; every step has a trivial
  rollback.
- The unit-test / CI foundation already in `main` makes the client-side
  refactors safer.
