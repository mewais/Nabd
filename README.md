# Nabḍ · نبض — Desk Workout Tracker & Planner

A **desktop** app for people who work from home next to a home gym. Instead of one gym
session, the workout is spread across the workday: one set every so often, between
meetings and builds. Nabḍ sits in the tray, notices a good moment, and tells you to go
do the next set. You log it; it works out what to suggest next time.

Built with **Tauri 2**: a small Rust core (SQLite, tray, notifications, idle time,
autostart) and a React/TypeScript frontend that holds all the domain logic.

## How it works

- **The plan** (Plan screen) is either _fixed_ — specific exercises per day — or
  _cycled_ — each day targets muscles, and each muscle rotates through a pool of
  exercises. Days are pinned to weekdays, or _floating_ (Day 1, 2, 3 … advancing only
  when a day is completed).
- **Today** is derived, never stored: the plan for the day, plus the sets logged today.
  Edit the plan and Today changes immediately; restart the app and nothing is lost.
- **Nudges** follow four rules:
  1. never outside the workday (Settings → Workday), while paused, or with nothing left;
  2. the timer nudges _interval_ minutes after your last set;
  3. an idle moment (no keyboard/mouse) nudges earlier — but never sooner than the
     _minimum gap_ after a set;
  4. Snooze silences both for five minutes.
- **A nudge is an invitation, not a limit.** The logger lists all of today's exercises;
  log one set or as many as you have time for, in any order. Supersets alternate, rest
  between back-to-back sets is counted down, any exercise can be skipped, and anything
  not in the plan can be logged as an extra.
- **Suggestions** use double progression against the same set of your previous session:
  inside your rep range → one more rep (or, alternatively, the same reps with more
  load); at the top → more load, back at the bottom of the range; below it → hold the
  load; below it twice running → back off one step. "More load" is your own weight
  increment (Settings → Training), so 8 × 25 lb suggests 9 × 25 lb or 8 × 27.5 lb.
- **Closing the window hides it**; the app lives in the tray (Start next set, Pause
  nudges, Open, Quit).

## Quick start

```bash
pnpm install
pnpm tauri dev          # the desktop app (needs a desktop session + webkit2gtk-4.1 on Linux)
pnpm dev                # just the UI in a browser, on an in-memory sample plan
pnpm tauri build        # production bundle
```

## Checks

```bash
pnpm test               # TypeScript suites (Vitest)
pnpm test:rust          # Rust crates
pnpm typecheck
pnpm lint
pnpm ci                 # all of the above
```

`scripts/visual/capture.mjs` drives the browser demo through the main flows and saves
screenshots.

## Layout

Code lives in `packages/` (TypeScript) and `src-tauri/` (Rust); each package's tests
live apart from it, under `tests/<package>/`. `workspace.config.ts` is the single map of
package locations that Vite and Vitest resolve through.

```
packages/
  B01-domain          types + zod schemas, settings, local-date helpers (the contract)
  B02-dataset         ExerciseLibrary: movement catalog × equipment × laterality
  B03-coverage        MuscleVolume: sets per muscle, from the plan or from history
  B04-scheduling      TodayPlan / PlanItem (today's queue) and day rollover
  B05-progression     ProgressionAdvisor, ExerciseHistory, per-exercise trends
  B06-session         LogSession (the set being entered), Coach, wording
  B07-nudge           NudgePolicy: when to say "time to move"
  B08-analytics       TrainingStats: streaks, completion, time of day, triggers
  B09-program-editor  ProgramEditor: every planner mutation, immutably
  B10-serialization   validates + migrates an import file
  B14-ipc-client      the typed boundary to the Rust backend
  B15-store           Zustand store: state, actions, memoized selectors
  B16-design-system   theme + primitives        B17-bodymap   anatomical SVG map
  B18-shell           sidebar / top bar         B19-today  B20-planner  B21-progress
  B22-modals          logger, nudge toast, library, settings, history chart
  B23-app             React wiring (containers, app loop) + browser demo backend
src-tauri/
  crates/B11-persistence   SQLite store + schema migrations
  crates/B12-native        tray menu model, notification text (pure)
  crates/B13-ipc           command core over SQLite
  src/                     the Tauri binary: commands, tray, window, plugins
```

Dependencies only point downward: engines (B02–B10) know nothing about React or the
store; screens (B18–B22) are presentational and take view-models built by pure
functions; the store is the only place that persists.

## Credits

- Body-map SVG paths adapted from
  [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)
  (MIT). See `NOTICE` and `assets/body/LICENSE`.
- © 2026 Mohammad Ewais — MIT (`LICENSE`).
