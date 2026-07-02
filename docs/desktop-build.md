# Desktop build (Electron)

The dashboard (`index.html` + `modules/`) is packaged as a desktop app with
[electron-builder](https://www.electron.build/). This is separate from the
mobile app (`mobile/`, Expo/EAS).

## macOS `.dmg`

Packaging **must run on macOS** (locally on a Mac, or the `Desktop build (macOS)`
GitHub Actions workflow on a `macos-latest` runner). It cannot be produced on
Linux/Windows.

### Build it

Locally on a Mac:

```bash
npm ci
npm run dist:mac        # outputs dist/Longhorn Car Wash-<version>-universal.dmg
```

Or trigger the **Desktop build (macOS)** workflow from the Actions tab
(`workflow_dispatch`) and download the DMG from the run's artifacts.

By default the build is **unsigned** (`CSC_IDENTITY_AUTO_DISCOVERY=false`), which
is fine for local testing. An unsigned app shows a Gatekeeper warning on other
Macs ("unidentified developer") that users must bypass via right-click → Open.

### Sign + notarize (for distribution)

To ship without Gatekeeper warnings you need an Apple Developer account (you
already have one — Team `68QFVQ738K`). Provide these as GitHub Actions secrets
(or local env vars) and remove the `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` line
in the workflow:

| Secret | What it is |
| --- | --- |
| `CSC_LINK` | base64 of your Developer ID Application `.p12` certificate |
| `CSC_KEY_PASSWORD` | password for that `.p12` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | an app-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | `68QFVQ738K` |

Then set `"notarize": true` (or configure `mac.notarize`) under `build.mac` in
`package.json`. electron-builder will sign with the Developer ID cert and submit
for notarization automatically.

## App icon

`logo.png` is 1107×549 (not square), so it is **not** used as the app icon —
macOS icons must be square. To brand the app, add a square
**1024×1024** `build/icon.png` (electron-builder converts it to `.icns`
automatically). Without it, the build succeeds using the default Electron icon.

## Windows `.exe` (planned)

`electron-squirrel-startup` is already a dependency for the Windows Squirrel
installer. A Windows target + workflow will be added next.
