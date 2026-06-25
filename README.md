# Nabḍ · نبض — Desk Workout Tracker & Planner

A **desktop** app for remote workers who spread a full workout across the workday — one
set every 15–50 min between meetings/builds — rather than one gym session. It watches for
idle time and/or a timer and nudges you to do the next set; you log it and the muscle
coverage + progress visuals update.

Built as a **Tauri 2** app: Rust core (SQLite, idle/tray/notifications/vibrancy) + a
React/TypeScript frontend. All domain logic is pure TypeScript; Rust is the native shell.

## Quick start

```bash
pnpm install
pnpm tauri dev          # launch the app (needs a desktop session)
```

Production bundle:

```bash
pnpm tauri build        # builds the frontend + the native bundle
```

> Linux needs `webkit2gtk-4.1` (already present on the dev machine). For production
> bundles you may want to replace the placeholder `src-tauri/icons/icon.png` with a full
> icon set (`pnpm tauri icon path/to/logo.png`).

## Tests

```bash
pnpm test                 # all TypeScript block suites (vitest, 100% coverage gates)
pnpm test:integration     # cross-block integration (IT1 domain e2e, IT3 front/back contract)
pnpm test:rust            # Rust crates (cargo)
pnpm cov:rust             # Rust coverage (cargo-llvm-cov)
pnpm typecheck            # whole-repo TypeScript typecheck
pnpm ci                   # everything
```

Current: **2,061 automated tests passing** (1,910 TS + 64 integration + 87 Rust), every
block at 100% coverage. The app builds (frontend bundle + `nabd` binary).

## Architecture (23 blocks)

```
packages/                         # TypeScript (each block: code in src/, tests in /tests)
  B01-domain          types, zod schemas, constants (the contract)
  B02-dataset         exercise library (re-tagged free-exercise-db + seed, 727 exercises)
  B03-coverage        muscle coverage & volume engine
  B04-scheduling      today's slots, cycled rotation, floating days, rollover
  B05-progression     suggestions, PRs, trends
  B06-session         two-pane one-set-per-log session reducer
  B07-nudge           idle + timer nudge engine
  B08-analytics       Progress-screen metrics
  B09-program-editor  planner mutations + board/editor view-models
  B10-serialization   import/export
  B14-ipc-client      typed Tauri IPC wrappers
  B15-store           Zustand store — wires engines + persistence (the integration brain)
  B16-design-system   theme + primitives
  B17-bodymap         anatomical SVG body map (vendored, Apache-2.0)
  B18-shell           sidebar / top bar / layout
  B19-today  B20-planner  B21-progress  B22-modals   screens + overlays
  B23-app             the runnable app: React wiring (src/) + Tauri binary (src-tauri/)
src-tauri/crates/
  B11-persistence     SQLite store (rusqlite)
  B12-native          pure native decisions (idle/vibrancy/tray/notification)
  B13-ipc             IPC command-core over SQLite
src-tauri/src/        Tauri binary: #[tauri::command]s + tray + plugins + vibrancy
integration-tests/    IT1 (domain e2e), IT3 (front/back contract), IT4 (E2E harness)
```

Tests live in separate trees (`tests/`, `integration-tests/`) from code; see
`docs/AGENTS_GUIDE.md` and each block's `AGENT.md`.

## Known limitations (for manual/visual QA)

- **GUI not yet run** in this environment (headless). `pnpm tauri dev` launches it on a
  desktop; visual fidelity vs the design tokens is the remaining manual pass.
- **IT4 E2E** (`integration-tests/IT4-app-e2e`) needs a display + `tauri-driver` +
  `webkit2gtk-driver`; run manually (see its README).
- **Tray menu** handles Open/Quit; Pause/Start tray items are present but not yet wired to
  the workout loop (secondary feature).
- Production icon set is a placeholder; run `pnpm tauri icon` for real bundles.

## Credits

- Body-map SVG paths: [vulovix/body-muscles](https://github.com/vulovix/body-muscles)
  (Apache-2.0). Exercise data re-tagged from
  [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).
  See `NOTICE`.
- © 2026 Mohammad Ewais — MIT (`LICENSE`).
