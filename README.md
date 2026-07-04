# Longhorn Car Wash

Timeclock, scheduling, and payroll software for Longhorn Car Wash. Employees
clock in/out (with geofencing and anti–buddy-punch checks), managers review
timesheets and run biweekly payroll, and the system sends punch/attendance
notifications.

## Surfaces

The repo contains three surfaces that share one Supabase backend:

| Path                                                     | What it is                                                                                                | Runs on              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| `index.html`, `renderer.js`, `modules/*.js`, `index.css` | The main dashboard — a browser PWA, also packaged as a desktop app.                                       | Browser / Electron   |
| `index.js`, `preload.js`                                 | Electron wrapper for the web app.                                                                         | Node (Electron main) |
| `mobile/`                                                | Employee mobile app.                                                                                      | Expo / React Native  |
| `supabase/`                                              | Database migrations and Deno edge functions (notifications, overtime & attendance checks, daily summary). | Supabase             |

The web app is plain ES modules — no bundler. `renderer.js` imports the feature
modules in `modules/` (`timeclock`, `manager`, `employee`, `schedule`, `ops`,
`analytics`, `settings`), all built on shared helpers in `modules/utils.js`.

## Pay-week model

Work weeks run **Wednesday → Tuesday**. Payroll is run Wednesday morning for the
two weeks that just ended, and payday is the **Friday** of that week (biweekly).
The shared date math lives in `modules/utils.js` (`getStartOfWeek`,
`getBiweeklyWeeks`).

## Getting started

### Web / desktop

```bash
npm install
npm start        # launch the Electron desktop app
```

To run the web app in a browser, serve the repo root with any static server and
open `index.html`. Supabase connection details live in `supabaseConfig.js`.

### Mobile

```bash
cd mobile
npm install
npm start        # Expo dev server
```

## Development

```bash
npm test           # unit tests (node:test) for the payroll/hours math
npm run lint       # ESLint over the web/Electron JS
npm run format     # Prettier (write); `npm run format:check` to check
```

Mobile type-checking: `cd mobile && npm run typecheck`.

## Continuous integration

`.github/workflows/validate.yml` runs on every push and pull request:

- HTML structure (tag nesting) via `scripts/check-html.py`
- Web JS syntax (`node --check`), ESLint, and the unit test suite
- Mobile TypeScript type-check (`tsc --noEmit`)
- `deno lint` over the Supabase edge functions

## Security

See [`SECURITY.md`](./SECURITY.md) for how to report a vulnerability.
