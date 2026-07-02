# Security Remediation Plan — RLS, credentials, and privileged RPCs

**Status:** proposal for review — nothing in this document has been applied.
**Author:** generated during the picture-capture crash follow-up.
**Scope:** the Supabase data layer shared by the web app, the Electron build, and the React Native mobile app.

---

## 1. The problem

The app has no real authentication boundary. Both clients (`supabaseConfig.js` and `mobile/src/lib/supabase.ts`) connect with the **public anon/publishable key**, and every table carries an RLS policy named `anon_access` defined as:

```sql
USING (true) WITH CHECK (true)   -- for ALL commands, role anon
```

That policy makes the anon key a full read/write master key for the whole database. Consequences, all reachable by anyone who views the site and reads the shipped key:

1. **Credential theft.** `public.users` stores `pin`, `password`, `pending_pin`, `pending_password`, and `two_factor_pin` as **plaintext `text`**, and anon can `SELECT *`. A single REST call dumps every employee's login credentials.
2. **Tampering.** Anon can `INSERT/UPDATE/DELETE` on `time_logs`, `schedules`, `settings`, `daily_revenue`, `early_clockin_approvals`, etc. — falsify punches, rewrite pay-affecting data, change app settings.
3. **Auth is client-trust.** Login runs as `from('users').eq('pin', pin)` / `.eq('name',u).eq('password',p)` in the browser. The "session" is just the returned row cached in `localStorage` / `AsyncStorage`. There are no server-enforced checks; the client decides who it is.

This is a design-level issue, not a bug in one file. The anon key being public is *fine by itself* — Supabase expects it to be public — **the problem is that RLS grants it everything.**

### Why we can't just fix the RLS

If we simply replace `anon_access` with restrictive policies, login breaks: the client reads `users` by PIN using the anon role, so locking down `SELECT` on `users` locks out every user. The credential columns and the login flow have to move server-side *first*. Hence the phased plan below.

---

## 2. Target architecture

Introduce a real authentication boundary while keeping the PIN/password UX:

- **Credentials never leave the database.** Login is performed by a `SECURITY DEFINER` function (or Edge Function) that takes the PIN/password, verifies it server-side against a **hashed** column, and returns only a safe profile (id, name, role, approval flag) — never the secret.
- **Clients hold a token, not a row.** The login function issues a short-lived signed token (Supabase Auth session, or a signed JWT) that identifies the user and role. RLS policies key off that identity instead of `true`.
- **Privileged writes are gated.** Tables get least-privilege policies (an employee can insert their own punch, a manager can edit any; nobody can read another user's secrets).
- **Server-only operations use the service role**, never the anon key (push sends, cross-user reads).

---

## 3. Phased rollout (additive first, so the live app never breaks)

### Phase 0 — Hardening already applied (done)
- Pinned `search_path` on the three `SECURITY DEFINER` notification functions (`20260710_pin_function_search_path.sql`). Non-breaking; closes the `function_search_path_mutable` warning.

### Phase 1 — Stop exposing secrets (highest value, moderate effort)
1. Add `pgcrypto`. Add hashed columns (`pin_hash`, `password_hash`) and backfill from the plaintext columns (`crypt(pin, gen_salt('bf'))`).
2. Create `SECURITY DEFINER` login functions that do the comparison server-side and return only safe fields:
   - `authenticate_pin(p_pin text) returns <safe profile>`
   - `authenticate_manager(p_name text, p_password text) returns <safe profile>`
   These `SET search_path = public, pg_temp`, are `REVOKE EXECUTE ... FROM public` then `GRANT` only as needed.
3. Point web (`timeclock.js`, `manager.js`) and mobile (`AuthContext.tsx`) login at these RPCs instead of `.eq('pin', …)` / `.eq('password', …)`.
4. Replace direct reads of `users` that pull profile data with a **view/RPC that excludes credential columns**, and drop the plaintext `pin`/`password`/`pending_*`/`two_factor_pin` columns once nothing references them.

*After Phase 1, credentials are no longer selectable even though RLS is still open — this removes the worst exposure quickly.*

### Phase 2 — Real identity + least-privilege RLS
1. Decide the identity mechanism:
   - **Option A (recommended):** migrate to Supabase Auth — create an auth user per employee, have the login RPC / an Edge Function mint a session. RLS uses `auth.uid()` / a `role` claim.
   - **Option B (lighter):** issue a signed JWT from the login function with a `role` claim and verify it in policies. Less standard, more custom code.
2. Replace every `anon_access` `USING(true) WITH CHECK(true)` policy with per-table, per-command policies. Sketch:
   - `users`: a user reads/updates only their own row (no secret columns); managers read the roster via a safe view.
   - `time_logs`: a user inserts rows for their own `user_id`; managers select/update all; nobody deletes (or managers only).
   - `settings`, `schedules`, `checklists`, `daily_revenue`: read for authenticated; write for management roles only.
   - `early_clockin_approvals`, `time_off_requests`, `shift_swaps`: insert own; management updates status.
3. Roll out table-by-table behind the new identity so each flow is verified before the old blanket policy is dropped.

### Phase 3 — Lock down privileged RPCs and server-only paths
1. Move push sending fully server-side (the existing `announcement-push-notify` Edge Function with the **service role**), and have the client call the Edge Function under its authenticated session.
2. `REVOKE EXECUTE` on `send_push_notification` / `send_schedule_notifications` from `anon` and `authenticated` (resolves the `anon_security_definer_function_executable` warnings). **Do not do this before step 1** — the client currently calls these RPCs directly with the anon key (`settings.js:341`, `schedule.js:453`), so revoking first breaks announcements.

### Phase 4 — Minor hardening
- Move the `pg_net` and `http` extensions out of the `public` schema (`extension_in_public` warnings).
- Leave `Password` and `notifications_sent` as-is (RLS enabled, no policy = deny to anon — already safe), or add explicit deny policies for clarity.
- Dependency vulnerabilities (24 Dependabot alerts reported at push time) are a separate track — triage and bump.

---

## 4. Risks & testing

- **Every phase is live-DB work on production data.** Do it against a Supabase branch/staging project first, verify all login + punch + manager flows on web and mobile, then promote.
- Backfilling hashes and dropping plaintext columns is destructive — snapshot first, and keep the plaintext columns until Phase 1 is verified in production.
- The mobile app ships compiled; a login-flow change requires a new build/release, so web and mobile must be migrated together or the RPCs must stay backward-compatible during the transition.

---

## 5. Suggested order of work

1. **Phase 1** — biggest risk reduction for the least architectural churn; ship it first.
2. **Phase 3 step 1 + 2** — closes the push-spam vector once Phase 1's auth boundary exists.
3. **Phase 2** — the full least-privilege RLS pass.
4. **Phase 4** — cleanup.
