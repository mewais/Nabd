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
  exercises, moving on to the next one each time the day comes round. Days are pinned
  to weekdays (at most one per weekday, so seven), or _floating_: Day 1, 2, 3 … in
  order, moving on once a day owes nothing more — completed, skipped, or empty. An
  unfinished floating day comes back the next day, weekends included; a day it merely
  waited on is not a missed day, so only days with a set (or that the plan moved on
  from) count toward completion. A few rules hold whatever is edited, stored or
  imported:
  - whether a set is counted in reps or in seconds is the exercise's doing, not a
    choice: a rep-counted exercise is prescribed as a range or a fixed number, a hold in
    seconds. A cycled pool shares one prescription, so it holds one kind — the kind of
    its first exercise — and the library only offers that kind for it;
  - a pool is tracked by exercise, not by position, so editing it never skips or
    repeats one;
  - a superset stays together: an exercise moved past it steps over the whole group, a
    member moves within it, and a member moved out past its edge is unlinked. The
    supersets of a day are lettered A, B, C … (A1/A2, B1/B2);
  - switching between weekdays and floating keeps today on the day it is on: going
    floating starts on today's weekday's day (the first day, on a rest day); going
    weekdays pins the current day to today and the days after it to the weekdays that
    follow;
  - deleting a day or a custom exercise, and importing over what is stored, ask first.
- **Today** is derived, never stored: the plan for the day, plus the sets logged today.
  Edit the plan and Today changes immediately; restart the app and nothing is lost. A
  set whose exercise has since left the plan (or the library) is still listed and
  counted, and a logger open on an exercise that leaves the queue moves on to the next
  one (or closes) rather than linger.
- **Nudges** follow four rules:
  1. never outside the workday (Settings → Workday), while paused, or with nothing left;
  2. the timer nudges _interval_ minutes after your last set (before the first one: after
     the workday started, the app was launched, or the plan got work — whichever is latest);
  3. an idle moment (no keyboard or mouse for the _idle moment_ setting) nudges earlier —
     but never sooner than the _minimum gap_ after a set;
  4. Snooze silences both for five minutes.

  A nudge that has fired stays up until it is answered — Start, Snooze, a logged set or
  Pause — even if you touch the mouse in the meantime, and the sets you then log are
  recorded as prompted by it. It shows as a toast in the window and, when the window is
  not in front, as a desktop notification (a window hidden in the tray is also brought
  back, unfocused). Left unanswered, the notification is repeated once per _interval_
  for as long as the window stays out of focus; the toast stays the one toast. Opening
  the logger answers it; closing the logger without logging keeps it quiet for the
  length of a snooze.

- **A nudge is an invitation, not a limit.** The logger lists all of today's exercises;
  log one set or as many as you have time for, in any order. Supersets alternate, rest
  between back-to-back sets is counted down, any exercise can be skipped for the day
  (and restored), and anything not in the plan can be logged as an extra ("log
  something else" on an exercise that is already in today's queue goes to that
  exercise). A set beyond an exercise's prescription keeps the form on that exercise.
  Reps and weight can be stepped (− / +, or ↑ / ↓ in the field: one rep, five seconds,
  one weight increment) or typed — a field can be emptied and retyped, and goes back to
  its last number if left empty — and Enter logs the set. Weights are shown to two
  decimals, so quarter-kilo steps read exactly.
- **Nothing logged is lost quietly.** A set the database would not take stays in the
  list, marked "not saved yet", and is retried on every clock beat, after any save that
  works, and before an export or Settings → Quit. Before an import replaces anything, a
  backup export (`nabd-backup-before-import-…json`) is written next to your exports.
  Stored settings are read field by field, so one bad value only resets itself.
- **Suggestions** use double progression against the same set of your previous session:
  inside your rep range → one more rep (or, alternatively, the same reps with more
  load); at the top → more load, back at the bottom of the range; below it → hold the
  load; below it twice running → back off one step. "More load" is your own weight
  increment (Settings → Training; 2.5 kg or 5 lb unless you choose your own, which a
  change of unit leaves alone), so 8 × 25 lb suggests 9 × 25 lb or 8 × 27.5 lb.
  A bodyweight exercise with nothing added is plain reps — "12 reps", then "8 + 2.5 kg
  or 13 reps" at the top of the range — and only an exercise that needs a bar or a
  dumbbell asks you to pick a starting weight. Warm-ups are left out of progression,
  volume and trends; the form remembers your last warm-up separately, and starts each
  kind of set (warm-up, working, drop) from its own numbers. An exercise's trend has one
  unit: an estimated 1RM once it has ever been loaded, reps or seconds until then.
- **Closing the window hides it**; the app lives in the tray (Start next set, Pause
  nudges, Open, Quit). Where the desktop shows no tray icons (stock GNOME without the
  AppIndicator extension) the app is an ordinary window: closing it quits, and "Start
  minimized" is switched off in Settings, which says why. Settings → Quit Nabd always
  exits.

## Prerequisites

Node ≥ 20 with pnpm (the version in `package.json`'s `packageManager`; `corepack enable`
provides it) and stable Rust (`rustup`), plus per platform:

- **Linux** (Debian/Ubuntu names):

  ```bash
  sudo apt install build-essential curl wget file pkg-config libssl-dev \
    libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
  ```

  `rpm` as well if you build the `.rpm` bundle. At run time the app needs
  `libwebkit2gtk-4.1-0`, `libgtk-3-0` and `libayatana-appindicator3-1`; the `.deb`/`.rpm`
  bundles declare them.

- **Windows 10/11**: the Microsoft C++ Build Tools ("Desktop development with C++"
  workload) and the WebView2 runtime — part of Windows 11, and installed by the Nabd
  installer on Windows 10 if it is missing.

## Platform support

|                 | Windows 10/11                          | Linux, X11                                                                 | Linux, Wayland                                                               |
| --------------- | -------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Tray            | always                                 | needs a StatusNotifier host: KDE, or GNOME with the AppIndicator extension | the same                                                                     |
| Without a tray  | —                                      | a plain window: closing it quits                                           | the same                                                                     |
| Idle time       | system-wide                            | GNOME (Mutter), else the X screen-saver extension, else KDE's screen saver | GNOME (Mutter), else `ext-idle-notify-v1` (KDE, Sway, Hyprland…), else KDE's |
| Glass           | Mica on Windows 11, blur on Windows 10 | not offered: no portable blur, so the window stays opaque                  | the same                                                                     |
| Open at startup | registry `Run` entry                   | an entry in `~/.config/autostart/`                                         | the same                                                                     |
| Notifications   | toast                                  | the desktop's notification service                                         | the same                                                                     |

Where the OS cannot report idle time, "idle" means no keyboard or mouse activity inside
the Nabḍ window, and Settings says so (also when the desktop's idle service is lost, or
comes back, while the app is running). A login launch always starts in the tray (if there
is one); "Start minimized" does the same for launches by hand. macOS is not a supported
target yet.

## Quick start

```bash
pnpm install
pnpm tauri dev          # the desktop app (needs a desktop session + webkit2gtk-4.1 on Linux)
pnpm dev                # just the UI in a browser, on an in-memory sample plan (http://localhost:1420)
pnpm tauri build        # production bundle
```

## Checks

```bash
pnpm test               # TypeScript suites (Vitest); one package: pnpm --filter @nabd/nudge test
pnpm test:rust          # Rust crates
pnpm typecheck          # packages and tests, one strict tsconfig
pnpm lint               # ESLint + Prettier
pnpm lint:rust          # rustfmt + clippy, over the whole Cargo workspace
pnpm check              # all of the above
```

## End-to-end tests

```bash
pnpm exec playwright install chromium   # once: the browser Playwright drives
pnpm e2e                                # build, serve with `vite preview`, run every spec headless
pnpm e2e specs/03-suggestions.spec.ts   # one spec; any `playwright test` argument can follow
```

`e2e/` holds Playwright specs that use the whole UI the way a person does — build a plan
in the planner, get nudged, log sets, change settings, read Progress — in a browser, on
the in-memory backend of `pnpm dev`. Two things make them deterministic:

- **the clock** is Playwright's fake one, installed before the page loads and frozen:
  time passes only when a spec says so, either with nobody at the keyboard
  (`app.idleFor`) or with the mouse moving in the window (`app.busyFor`) — in a browser
  the app takes its idle time from activity inside the page;
- **the data** a spec starts from is handed to the demo backend through
  `window.__NABD_E2E_SNAPSHOT__` (`packages/app/src/demo.ts`), the one seam the tests
  have. It is read only where the demo backend is built, which the desktop app never does.

`e2e/support/` has the fixture (`app`), one page object per screen and modal, and the
builders for plans and history; the browser runs in a non-UTC time zone so "today" is
tested as the user's calendar day. A spec marked `test.fail` documents designed behaviour
the app does not have yet: it starts failing the day the app is fixed, and the mark comes
off. No spec is marked at present.

## Smoke test

```bash
sudo apt install xvfb dbus openbox xdotool sqlite3 curl webkit2gtk-driver
cargo install tauri-driver --locked
pnpm smoke:linux                        # = scripts/smoke/linux-smoke.sh
```

What the browser cannot reach — the native shell, SQLite, the window's life cycle — is
checked on the real binary, Linux only. The script builds the debug binary and runs it in
a throw-away session (Xvfb, its own D-Bus session, openbox) with `HOME` and the XDG
directories in a temporary directory, then expects: a window; a database at schema
version 2 that the frontend has written its day state to; the app quitting when its window
is closed (the session has no tray host); a stored plan surviving a restart, with the day
that ended meanwhile rolled over; a second launch exiting while the first keeps running;
and — through WebDriver, when `tauri-driver` and `WebKitWebDriver` are installed — a set
logged in the real window landing in the `history` table and, like Pause, surviving a
restart. `NABD_SMOKE_BINARY=<path>` tests an existing binary instead of building one.

Not covered anywhere: the tray icon and its menu, desktop notifications, system-wide
idle time, autostart, and everything Windows-specific.

`scripts/visual/capture.mjs` drives the browser demo through every screen and modal, in
both themes, and saves screenshots; `scripts/visual/make-icon.mjs` renders the app
icon's source image from the in-app logo.

## Layout

Code lives in `packages/` (TypeScript, one `@nabd/<name>` package per directory) and
`src-tauri/` (Rust); tests live apart from the code, under `tests/<package>/` and
`tests/rust/<crate>/`, with shared fixtures in `tests/support/` and
`tests/rust/common/`. The `paths` block of `tsconfig.json` is the single map of package
locations; `workspace.config.ts` turns it into the aliases Vite and Vitest resolve
through.

```
packages/
  domain          the shared vocabulary: types + zod schemas, settings, muscle and
                  equipment tables, local-date, number and text helpers
  dataset         ExerciseLibrary: movement catalog × equipment × laterality
  coverage        MuscleVolume: sets per muscle, from the plan or from history
  scheduling      TodayPlan / PlanItem (today's queue) and day rollover
  progression     ProgressionAdvisor, ExerciseHistory, ExerciseProgress (trends)
  session         LogSession (the set being entered), Coach, wording
  nudge           NudgePolicy: when to say "time to move"
  analytics       TrainingStats: streaks, completion, time of day, triggers
  program-editor  ProgramEditor: every planner mutation, immutably, and the rules a
                  program obeys however it was edited, stored or imported
  serialization   validates + migrates an import file; upgrades values stored by older
                  versions
  ipc-client      the typed boundary to the Rust backend, and an in-memory stand-in
  store           Zustand store, one file per slice: state, actions, memoized selectors,
                  and what holds after every change (settle.ts)
  design-system   theme, tokens and every presentational primitive
  bodymap         the anatomical SVG map and its per-muscle meter
  shell           the app chrome: sidebar, top bar, notice banner
  today           the Today screen
  planner         the Plan screen
  progress        the Progress screen
  modals          set logger, nudge toast, exercise library, settings, history chart,
                  and the confirmation asked before anything destructive
  app             React wiring (containers, app loop) + the browser demo backend
src-tauri/
  crates/persistence   Store: SQLite, the singletons and the set history, migrations
  crates/native        the pure decisions behind native features (tray model,
                       notifications, capabilities, launch/close, idle backends)
  crates/ipc           Commands: what the frontend can ask of the stored data
  src/                 the Tauri binary: commands/, tray, window, clock, glass,
                       autostart, export, and idle/ (one backend per platform API)
tests/                 tests/<package>/, tests/rust/<crate>/, tests/support/
e2e/                   Playwright specs of the whole UI, with their page objects
scripts/               the Vitest setup file, the visual scripts and the Linux smoke test
assets/body/           the vendored body-map drawing
```

Dependencies only point one way: `domain` ← engines (`dataset` … `serialization`) ←
`store`, and `design-system` ← `bodymap` ← screens. Engines know nothing about React or
the store. Every screen package (`shell`, `today`, `planner`, `progress`, `modals`) has
the same shape: an `index.ts` that only exports, a pure `build…VM` function that turns
domain objects into exactly what is rendered, an actions interface saying what the
screen asks of the app, and presentational components taking `{ vm, actions }`. Screens
never import the store; the containers in `packages/app/src/containers/` connect the
two (select state → build the view-model → bind the actions). The store is the only
place that persists.

## Credits

- Body-map SVG paths vendored from
  [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)
  (MIT, © 2022 ELABBASSI Hicham) — `assets/body/LICENSE`.
- Bundled fonts: Hanken Grotesk and JetBrains Mono (SIL Open Font License 1.1) —
  `packages/app/public/fonts/OFL.txt`.
- Full attribution is in `NOTICE`.
- © 2026 Mohammad Ewais — MIT (`LICENSE`).
