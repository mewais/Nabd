# IT4 · App E2E (tauri-driver + WebdriverIO)

Drives the **built** `nabd` desktop binary through real user journeys. Requires a
desktop session (X/Wayland or a headed display) — it **cannot run headless** in CI
here, so it is run manually.

## Prerequisites
- `cargo install tauri-driver`
- A WebKitWebDriver (`apt install webkit2gtk-driver` on Linux) on PATH
- A built app: `pnpm --filter @nabd/app build && cargo build --manifest-path src-tauri/Cargo.toml`

## Run
```
cd integration-tests/IT4-app-e2e
npm i   # installs @wdio/cli + webdriverio (devDeps below)
npx wdio run ./wdio.conf.ts
```

## Journeys covered (specs/app.e2e.ts)
1. **Launch & hydrate** — window opens; the Today screen renders the next-set hero and
   today's rhythm (proves frontend↔backend `load_all` works end-to-end).
2. **Log a set** — open the session modal, "Log this set"; the day donut + coverage update.
3. **Persistence across relaunch** — log a set, quit, relaunch; the logged set/history
   is still reflected (proves SQLite persistence through the real IPC commands).
4. **Nudge** — fast-forward settings (short interval) → notification toast appears.

If a journey fails, it indicates a real wiring/native bug to fix in B23 (or the block it
surfaces). This is the final gate before declaring the tool "fully working".
