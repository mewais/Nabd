# Architecture

Code lives in `packages/` (TypeScript, one `@nabd/<name>` package per directory) and
`src-tauri/` (Rust); tests live apart from the code, under `tests/<package>/` and
`tests/rust/<crate>/`. The `paths` block of `tsconfig.json` is the single map of package
locations; `workspace.config.ts` turns it into the aliases Vite and Vitest resolve
through, and `vitest.workspace.ts` makes one test project of every package that has a
`tests/<package>/` directory (in a DOM if the package depends on React, in Node
otherwise).

```
packages/
  domain          the shared vocabulary: the persisted model (types + zod schemas) with
                  its name tables and rules, settings, what a machine can do, and the
                  small helpers everything is written with (local dates, numbers,
                  lists, JSON, text)
  view            what the user is looking at, as types only: screen, map view, tab,
                  notice, the library's state — shared by the store and the screens
  dataset         ExerciseLibrary: movement catalog × equipment × laterality
  coverage        MuscleVolume: sets per muscle, from the plan or from history
  scheduling      TodayPlan / PlanItem (today's queue), DayLedger (what a day owed and
                  did) and day rollover
  progression     ProgressionAdvisor, ExerciseHistory, ExerciseProgress (trends, in kg)
  session         LogSession (the set being entered), Coach, wording
  nudge           NudgePolicy: when to say "time to move"
  analytics       TrainingStats: streaks, completion, time of day, triggers
  program-editor  ProgramEditor and PrescriptionEditor: every planner mutation,
                  immutably, and the rules a program obeys however it was edited,
                  stored or imported
  serialization   upgrades whatever an older version stored or exported to today's
                  shape, and validates an import file
  ipc-client      the typed boundary to the Rust backend, and an in-memory stand-in
  store           Zustand store, one file per slice: state, actions, memoized selectors,
                  and what holds after every change (settle.ts)
  design-system   theme, tokens (colours and tints, spacing, sizes and named widths,
                  type roles and weights, radii, shadows, layers) and every
                  presentational primitive: layout (Row, Stack, Grid, WithSide,
                  Divider…), Text, Card, ButtonBase under every button and
                  InputBase under every field; one prop vocabulary for all of them
                  (the CONVENTIONS at the top of its index.ts); the words its
                  primitives say, and those the screens share (wording.ts); the
                  window's pre-paint colour (prepaint.json)
  bodymap         the anatomical SVG map (its vendored drawing in src/drawing/), the
                  per-muscle meter, and the muscles as the options of a picker
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
  crates/ipc           DataCommands: what the frontend can ask of the stored data
  src/                 the Tauri binary: lib, main, commands/ (data, native), db, error,
                       tray, app_menu (the macOS menu bar's app menu: Cmd+Q), window,
                       clock, glass, autostart, notifications, export, platform/ (what
                       differs between the desktops: linux, macos, windows) and idle/
                       (one backend per platform API: dbus, wayland, x11 under linux;
                       macos; windows)
  build.rs             the version check, the window title and its background (development.md, Checks)
tests/                 tests/<package>/, tests/rust/<crate>/, tests/scripts/ (the local
                       ESLint rules), and the shared kits: tests/support/ (the fixture
                       kit — builders, exercises, programs — and world, dom) and
                       tests/rust/common/
e2e/                   Playwright specs of the whole UI, with their page objects and
                       shared config, and the screenshot capture (visual/: the screens,
                       and the app icon's source image)
scripts/               the Vitest setup file, the local ESLint rules and the smoke
                       tests (smoke/: one entry per platform, the checks they
                       share and their runner, the app's data and processes,
                       the window per desktop, the WebDriver acts, client and
                       driver process, and the fake Linux desktop services)
```

**Dependencies only point one way**, and ESLint refuses an import that does not
(`scripts/eslint/layers.js`; a test checks that this drawing is the one it enforces).
Each package, with what it may import:

```
domain          ← —
view            ← domain
engines         ← domain, one another
ipc-client      ← domain
store           ← domain, view, engines, ipc-client
design-system   ← domain, view
bodymap         ← domain, view, coverage, design-system
screens         ← domain, view, engines, design-system, bodymap
app             ← all of them

engines: dataset, coverage, scheduling, progression, session, nudge, analytics, program-editor, serialization
screens: shell, today, planner, progress, modals
```

Engines know nothing about React, the view vocabulary or the store; screens use the
engines but never the store or the backend; only `app` joins the two sides, in
`packages/app/src/containers/` (select state → build the view-model → bind the
actions). The store is the only place that persists. View vocabulary lives in `view`
rather than `domain` so that the engines never see it, and so that neither the store
nor a screen has to declare the other's types.

**Every screen package** (`shell`, `today`, `planner`, `progress`, `modals`) has the
same shape:

- `index.ts` only exports: the root component, its `build…VM` function, and the types
  the app (or a test) needs of them.
- View-models are in `<name>-vm.ts`: the `<Name>VM` types and a pure
  `build<Name>VM` function that turns domain objects into exactly what is rendered,
  every word already written, and every change a control makes already worked out (a
  settings row carries its patch, a chip of a multi-select the list it leaves). The
  screen's own is `<screen>-vm.ts`.
- `<screen>-actions.ts` declares `<Screen>Actions`: what the screen asks of the app.
- `options.ts` holds the package's pickers (what each `Segmented`, `Dropdown` or chip
  group offers), built with `optionsOf(keys, names)` — the names a domain table or a
  naming function — or, where the labels are the screen's own, written out; a picker
  more than one screen offers lives below them (the muscles in `bodymap`, the themes in
  `design-system`). `wording.ts` holds every word a component shows that its view-model
  does not carry (headings, button and field labels: its `WORDS`) and any text helpers;
  it is the package's one wording module, and a component writes no words of its own.
  Words two screens say of the same thing are written once, below them
  (`COMMON_WORDS` and `SCREEN_NAMES` in `design-system`).
- Components are one per file, named after the file, each with a `<Name>Props`
  interface, and take their props by one rule:
  - **`vm`** — the view-model, or the part of it, that the component draws. Anything
    else it needs is a plain, named value (`dayId`, `columns`, `text`).
  - **`actions`** — the screen's actions interface, or a `Pick<>` of it, for a
    component that calls the screen's asks itself (the root, and any section or row
    below it).
  - **`onX` callbacks** — instead of `actions`, never beside it — for a component whose
    events mean what its parent says they mean: the parent supplies the closure
    (`MoveButtons.onMove`, `SetTable.onEdit`, `StepperCard.onStep`).
  - Nothing is passed through React context.

In the planner every change to the program is a `ProgramEdit` — `(editor) =>
editor.moveDay(id, 1)` — handed to the one `edit` action; a change to a prescription is a
`PrescriptionEdit` handed to `editor.editPrescription`. Each operation is declared once,
on `ProgramEditor` or `PrescriptionEditor`, and written out where the user triggers it;
both work alike: a method returns a new program (or prescription) and leaves the one it
was given untouched.

In the store, the actions are grouped as slices (`DaySlice`, `LoggingSlice`, … in
`slices.ts`, one file each). A slice never imports another slice: what it needs of
another it asks for through `get().action()`, and what two of them share lives in a
helper module (`state`, `context`, `persistence`, `unsaved-sets`, `hydration`,
`rollover`, `open-session`, `os`, `selectors`, `settle`).
