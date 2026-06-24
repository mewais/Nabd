# Nabḍ — Architecture, Block, Test & Execution Plan

> One-shot architecture for a desktop desk-workout tracker. Author: Mohammad Ewais
> <mohammad.a.ewais@gmail.com>. Repo: `git@github.com:mewais/Nabd.git`.

---

## 1. Stack & Top-Level Decisions (locked)

| Decision | Choice |
|---|---|
| Shell | **Tauri 2.x** (Rust core + system webview) |
| Frontend | **React 18 + TypeScript + Vite** |
| State | **Zustand** (thin store binding pure engines) |
| Validation | **Zod** (runtime schemas == TS types) |
| Persistence | **SQLite via `rusqlite`** in Rust, exposed over Tauri commands |
| AI features | **Deterministic heuristics** (no network) |
| Body map | Vendored **`vulovix/body-muscles`** SVG paths (Apache-2.0, attributed) |
| Exercise data | **Re-tag `yuhonas/free-exercise-db`** (public domain) + merge handoff seed → bundled `exercises.json` |
| TS tests | **Vitest** + **@testing-library/react**, coverage via **v8**, threshold **100%** |
| Rust tests | **cargo test** + **cargo-llvm-cov**, threshold **100%** |
| E2E | **tauri-driver + WebdriverIO** |
| Monorepo | **pnpm workspaces** (TS packages) + **cargo workspace** (Rust crates) |

**Architecture principle:** all *domain logic is pure TypeScript* (instant, reactive, single test
toolchain). Rust is a thin layer: SQLite persistence + native capabilities (idle, tray, notifications,
vibrancy, autostart) + IPC. The frontend holds working state and calls Rust only to load/save and to
reach the OS.

### 23-muscle taxonomy (final)
`front_delts, side_delts, rear_delts, neck, upper_traps, rhomboids, lower_traps, lats, lower_back,
chest, abs, obliques, quads, hamstrings, glutes, abductors, adductors, calves, tibialis, hip_flexors,
biceps, triceps, forearms`
Display rolls these up onto body-muscles SVG regions via `MUSCLE_REGION_MAP` (rhomboids→`traps-mid`,
abductors→`gluteus-medius`, etc.). Analytics/coverage operate at the 23-muscle level.

---

## 2. Repository Layout (block isolation by construction)

Each block has **code** and **tests** in *physically separate* trees so access can be restricted and
agents cannot edit the tests they must satisfy.

```
Nabd/
├─ package.json, pnpm-workspace.yaml, tsconfig.base.json, vitest.workspace.ts
├─ Cargo.toml (workspace)
├─ ARCHITECTURE.md, README.md, LICENSE, NOTICE (3rd-party attributions)
├─ assets/                         # vendored body-muscles paths, fonts list, wallpapers
│
├─ packages/                       # ── TS block CODE (coding agents: RW here only) ──
│   ├─ B01-domain/        src/  package.json  vitest.config.ts  AGENT.md
│   ├─ B02-dataset/       src/  ...           tools/  data/        AGENT.md
│   ├─ B03-coverage/      ...
│   ├─ ... (B04..B10 pure engines)
│   ├─ B14-ipc-client/    ...
│   ├─ B15-store/         ...
│   ├─ B16-design-system/ ...
│   ├─ B17-bodymap/       ...
│   ├─ B18-shell/  B19-today/  B20-planner/  B21-progress/  B22-modals/
│   └─ B23-app/           src/  index.html  vite.config.ts  AGENT.md   # assembles everything
│
├─ src-tauri/                      # ── Rust block CODE ──
│   ├─ Cargo.toml  tauri.conf.json  build.rs
│   ├─ crates/
│   │   ├─ B11-persistence/  src/  Cargo.toml  AGENT.md
│   │   ├─ B12-native/       src/  Cargo.toml  AGENT.md
│   │   └─ B13-ipc/          src/  Cargo.toml  AGENT.md
│   └─ src/ main.rs                # binds B11–B13 into the Tauri app (part of B23/wiring)
│
├─ tests/                          # ── BLOCK TESTS (test agents: RW; coding agents: RO) ──
│   ├─ B01-domain/  *.test.ts  AGENT.md
│   ├─ ... one dir per block (B01..B10, B14..B23)
│   └─ rust/                       # Rust block tests live as integration tests
│       ├─ B11-persistence/  *.rs  AGENT.md
│       ├─ B12-native/       *.rs  AGENT.md
│       └─ B13-ipc/          *.rs  AGENT.md
│
└─ integration-tests/              # ── CROSS-BLOCK TESTS ──
    ├─ IT1-domain-e2e/     AGENT.md   # engines wired together (TS)
    ├─ IT2-persistence/    AGENT.md   # Rust DB + IPC commands together (Rust)
    ├─ IT3-frontend-backend/ AGENT.md # store ↔ real Tauri commands (TS, mocked + contract)
    └─ IT4-app-e2e/        AGENT.md   # tauri-driver full user journeys
```

**How tests sit apart from code yet still run:** each block's `vitest.config.ts` (in `packages/<b>`)
sets `include: ["../../tests/<b>/**/*.test.ts"]` and `coverage.include: ["src/**"]` with 100%
thresholds. Rust blocks expose a public API; their tests live in `tests/rust/<b>` wired via a thin
test crate / `[[test]]` path entries, exercising only public items (each Rust block is shaped so 100%
of lines are reachable from its public surface).

**Skeletons lock the interface.** During scaffolding (Phase 0, done by me) every block's `src/` is
generated as **typed skeletons**: exact signatures, types, and `throw new Error("not implemented")`
(TS) / `unimplemented!()` (Rust) bodies. This means: (a) test agents write tests against real, fixed
signatures; (b) before code exists every test *fails* but coverage instruments the skeleton lines, so
"100% coverage, all red" is achievable and meaningful; (c) coding agents cannot drift the interface.

---

## 3. Blocks

Legend — **Kind**: `pure` (stateless transforms / one-shot), `stateful` (holds/reduces state),
`native` (OS/IO), `ui` (React), `data` (artifact + accessors). Every block lists Inputs → Outputs,
Dependencies, and Test focus. All target **100% line+branch coverage**.

### Layer A — Contracts

**B01 · Domain Types & Constants** — `TS, pure`
- *Responsibility:* the single source of truth every block imports. Zod schemas + inferred TS types
  for: `MuscleKey`(23), `MuscleGroup`(12), `Equipment`, `GymProfile`, `TrackingType`(8), `Exercise`,
  `SetSpec`(type warmup|working|drop, a, b?, val?), `ExercisePrescription`(exId, repMode, intensity,
  rest, sets[], notes?, supersetId?), `CycledSlot`(group, pool[], +prescription), `Day`, `Program`,
  `PlannedSet`, `Slot`(exercise, group, muscles, sets, done, status, result, time), `LoggedSet`
  (exId, reps|sec, weight?, ts, trigger), `SessionReceiptItem`, `Settings`, `Coverage`, `AppData`
  (export/import envelope w/ version). Constants: `MUSCLES`, `MUSCLE_NAMES`, `MUSCLE_GROUPS`,
  `GROUP_MUSCLES`, `EQUIPMENT`, `GYM_PROFILES`, `TRACKING_TYPES`, `MUSCLE_REGION_MAP`, theme `THEMES`,
  `WALLPAPERS`.
- *In→Out:* `unknown` → `parse()` validated domain object / `ZodError`.
- *Deps:* none. *Test:* valid+invalid fixtures per schema; constant invariants (every group's muscles
  ∈ taxonomy; region map covers all 23; gym profiles reference real equipment; theme tokens complete).

### Layer B — Pure Domain Engines (TS)

**B02 · Exercise Dataset Pipeline + Accessors** — `TS, data + pure`
- *Two parts.* (1) **Offline pipeline** (`tools/build-dataset.ts`): input free-exercise-db JSON +
  handoff seed → normalize equipment vocab→our keys, muscle vocab→23 keys, **delt-head/­tracking-type
  heuristics** from `name`/`force`/`mechanic`/`category`, merge+dedupe, validate vs B01 → emit
  `data/exercises.json`. (2) **Runtime accessors:** `allExercises()`, `byId`, `search(q)`,
  `byGroup`, `filterByProfile(equipment)`, `musclesOf(ex)`, `withCustom(custom[])`.
- *In→Out:* raw datasets → bundled JSON (build); JSON + query → exercise lists (runtime).
- *Deps:* B01. *Test:* every mapping rule (vocab, equipment, tracking inference, delt heuristics),
  dedupe/merge precedence (seed wins), accessor filtering/search/profile scoping; output JSON validates
  against B01 schema (golden test).

**B03 · Coverage & Volume Engine** — `TS, pure`
- `computePlanVolume(program, lookup)` (primary=full set, secondary=½; fixed vs cycled),
  `planCoverage(volume)`→%, `coverageFrom7dHistory(history)`, `applySetDelta(cov, muscles, d)`,
  `recommendation(pct)`→rest|push|none, `insight(cov)`→{rest[],push[]}.
- *Deps:* B01, B02(lookup). *Test:* weighting, fixed/cycled paths, clamping 0–100, thresholds
  (≥66 rest, ≤38 push), insight ordering, empty inputs.

**B04 · Scheduling Engine** — `TS, pure`
- Builds the day. `resolveTodayDay(program, date, progressState)` (weekday→match; floating→
  advance-on-completion index), `rotationFor(group, pool, rotationState)` (per-training-day pointer,
  drift), `buildSlots(day, lookup, rotationState)`→expand exercises/cycled-slots into per-**set**
  `Slot`s w/ times (start 09:30 + interval), `applyStatuses(slots, doneCount)`,
  `startOutOfOrder(slots, id)`, `rollover(state, date)` (unfinished→skipped, fresh day, advance
  rotation/floating). 
- *Deps:* B01, B02. *Test:* weekday mapping incl. none-today; floating progression + skip-stays;
  cycled drift (3-pool vs 2-pool over a week); set expansion counts; status transitions; out-of-order;
  rollover skip-marking + pointer advance; rest day; empty program.

**B05 · Progression & Suggestion Engine** — `TS, pure`
- `suggest(exercise, history)`→{reps|sec, weight?, note, up} per tracking type (+1 rep / +2.5 kg /
  +5 s); `personalBest(series, track)`; `estimate1RM(w, reps)`; `trendPoints(series, w,h,pad)`;
  `gain(series)`; `fullHistorySeries(history, ex)`.
- *Deps:* B01. *Test:* each tracking type suggestion + note text; PR; 1RM (Epley); trend point math
  (single/empty/flat); gain sign; defaults when no history.

**B06 · Session Engine** — `TS, pure reducer`
- `openSession(slot, history)`→form; `logSet(session, form)`→{slots', coverageDelta, receipt',
  nextForm, allDone}; `switchExercise(session, slotId|name)`; one set per log; stay-then-advance;
  banked receipt.
- *Deps:* B01, B03(delta), B05(suggest). *Test:* single log increments done/status; multi-set same
  exercise; auto-advance on completion; jump to arbitrary exercise; all-done terminal; receipt
  accumulation; coverage delta emitted.

**B07 · Nudge / Timer Engine** — `TS, pure reducer`
- `tick(state)`→ decrement `secondsToNext`, increment `idleSeconds`, raise notif when
  `countdown==0` OR `idle≥idleNudge` (whichever first), suppressed while modal/notif open;
  `resetIdle`, `snooze`(+5 min, reset idle), `dueNotif(reason, slot)`.
- *Deps:* B01, B04(currentSlot). *Test:* timer→0 fires timer notif; idle≥thr fires idle notif;
  first-wins; suppression; snooze; idle reset; no slot → no notif.

**B08 · Analytics Engine** — `TS, pure`
- From history: `streak`, `completionThisWeek`, `setsThisWeek`, `activeDays30`, `timeOfDay(hist)`
  histogram + peak, `triggerMix(hist)` (idle/timer/manual %), `calendarHeatmap(month, hist)` levels,
  `weeklyBars(8w)`, `completionLast7`.
- *Deps:* B01. *Test:* each metric from synthetic histories; empty; boundary weeks; level bucketing;
  peak tie-break.

**B09 · Program Editor Engine** — `TS, pure mutations`
- Immutable mutations powering the planner: `addDay/removeDay/renameDay/setWeekday`, `setType`
  (fixed↔cycled + `deriveSlots`), `setSchedule`, `addExercise/removeExercise`, `setRepMode/
  setIntensity/setRest`, `addSet/addWarmup/removeSet/cycleSetType`, `stepRep/stepVal/stepRest`,
  `toggleSuperset`, `addSlot/removeSlot/addToPool/removeFromPool`, `setNotes`; plus derived views:
  `boardLayout(program, profile)`, `daySummary`, `editorModel`.
- *Deps:* B01, B02. *Test:* every mutation + invariants (superset link/unlink adjacency; set-type
  cycle order working→warmup→drop; rep-mode transitions add/drop `b`; intensity add/clear `val`;
  clamps on reps/rpe/%/rest; deriveSlots grouping; board weekday vs floating; summary math).

**B10 · Import/Export Serialization** — `TS, pure`
- `serialize(state)`→`AppData` JSON; `deserialize(json)`→validated partial w/ migration; ignore bad
  fields; `version` handling.
- *Deps:* B01. *Test:* round-trip equality; partial documents; corrupt/extra fields ignored; version
  migrate; schema-reject.

### Layer C — Rust (native + persistence)

**B11 · SQLite Persistence** — `Rust, native/IO`
- `rusqlite` schema + migrations; repositories for `program`, `custom_exercises`, `settings`,
  `history(logged sets: exId, value, weight, ts, trigger)`, `rotation_state`, `day_state`. Functions
  take a `&Connection` (tested against in-memory DB). CRUD + history range queries + bulk
  load/replace (for import).
- *Deps:* none (serde DTOs mirror B01). *Test:* migrations idempotent; each CRUD; range queries;
  replace-all (import); constraints/uniqueness; empty DB defaults.

**B12 · Native Capabilities** — `Rust, native`
- Idle detection (`user-idle`/platform), system tray + menu, OS notifications, window
  vibrancy/acrylic + opacity, autostart, single-instance. Native effects sit behind **traits** so the
  *decision logic* (idle-threshold crossing, tray-state mapping, notify payload building) is unit
  tested with fakes.
- *Deps:* B11(settings). *Test:* idle-cross logic via fake clock; tray menu model per app-state;
  notification payload; vibrancy param mapping from opacity; autostart toggle calls. (Pure-glue lines
  100%; genuinely un-testable FFI is isolated to thin `#[cfg(not(test))]` shims documented in AGENT.md.)

**B13 · Tauri IPC Command Layer** — `Rust`
- `#[tauri::command]` fns: `load_all`, `save_program`, `save_settings`, `append_logged_set`,
  `save_custom_exercise`, `save_rotation/day_state`, `export_file`, `import_file`, `set_theme`,
  native commands (`set_vibrancy`, `notify`, `tray_update`, `get_idle`). Maps DTO↔domain JSON, error
  mapping to a typed `IpcError`.
- *Deps:* B11, B12. *Test:* command (de)serialization; error mapping; delegates to B11/B12 fakes;
  argument validation.

### Layer D — Frontend (TS/React)

**B14 · IPC Client / Repository Adapter** — `TS, pure-ish`
- Typed wrappers over `@tauri-apps/api` `invoke` for every B13 command; DTO↔domain mapping; error
  normalization; in non-Tauri (test/web) falls back to an injectable transport.
- *Deps:* B01. *Test:* each wrapper invokes correct command+args, parses result, maps errors (mock
  invoke); transport injection.

**B15 · State Store (Zustand)** — `TS, stateful`
- The app brain: holds `AppState`, wires engines B03–B10 + repository B14. Actions == every handler in
  the prototype (`setScreen, setTheme, startNext, confirmNotif, snooze, logSet, switchExercise,
  tick, planner p*/g* via B09, lib*, settings*, export/import, openProgChart`). Selectors produce
  view-models. Persists via B14 on mutations; hydrates on boot.
- *Deps:* B01, B03–B10, B14. *Test:* each action transitions state via engines + triggers correct
  repo save; selectors; hydration; tick integration; coverage/donut recompute.

**B16 · Design System** — `TS/React, ui`
- `ThemeProvider` (applies `THEMES` CSS vars + opacity/wallpaper), primitives: `Button`, `Segmented`,
  `Stepper`/`MiniStepper`, `Pill/Chip`, `Card`, `Toggle`, `Donut`, `Badge`, `Icon` set (Feather +
  heart logo), fonts loading. Pure presentational, token-driven.
- *Deps:* B01(THEMES). *Test:* render per theme applies vars; primitive props/variants; callbacks fire;
  donut conic math; toggle states.

**B17 · BodyMap** — `TS/React, ui + data`
- Vendor body-muscles paths into `assets/`; `BodyMap({side, coverage, style:heat|outline, view})`
  renders SVG, tints each region by aggregated muscle coverage via `MUSCLE_REGION_MAP`; titles/tooltips.
- *Deps:* B01, B03. *Test:* region→muscle aggregation; heat opacity vs outline stroke math; unmapped
  region neutral; front/back/both; coverage 0/50/100.

**B18 · App Shell** — `TS/React, ui` — Sidebar (brand, nav, donut), TopBar (greeting/date/clock,
status pill w/ live dot, theme segmented, gear), layout, screen routing. *Deps:* B16,B17. *Test:*
nav active state, greeting by hour, status pill values, theme switch callback, donut wiring.

**B19 · Today Screen** — `TS/React, ui` — hero next-set card (kicker/exercise/chips/suggestion/
buttons), rhythm list (rows: time, dot, name, sub, badge, Start; statuses; hover-start), coverage card
(BodyMap + toggles + per-muscle bars + recs), volume-insight card, 3 stat tiles. *Deps:* B16,B17.
*Test:* hero from view-model, all-done state, rhythm row statuses + start callbacks, toggles, bars,
insight text.

**B20 · Planner Screen** — `TS/React, ui` — program header (name, Fixed|Cycled, Weekdays|Floating,
profile dropdown), week board (weekday grid w/ rest/add + floating cards), day editor (rename, weekday
picker, summary, delete), **sets table** (type badge cycle, rep steppers single/range/time, intensity
steppers, remove, add set/warmup/superset, notes), superset group, cycled slot (pool chips + add,
prescription table), add-exercise/add-group, coverage rail. *Deps:* B16,B17. *Test:* every control
renders+calls its handler from the editor view-model; fixed vs cycled; superset grouping; board modes.

**B21 · Progress Screen** — `TS/React, ui` — KPI strip, Consistency (Calendar|Weekly tabs), Completion
card, Time-of-day histogram + peak, Trigger mix bar+legend, Sets-per-muscle heatmap, Progression rows
(sparkline, PR, gain) → opens full-history modal. *Deps:* B16,B17,B22(modal). *Test:* each section from
analytics view-model; tab toggle; row click opens chart; sparkline points.

**B22 · Modals** — `TS/React, ui` — **Session modal (two-pane)**: left exercise list w/ `done/total`
+ green check, right log form (`Set X of Y`, muscles, suggestion, reps/sec + weight steppers, *Log this
set*), session receipt + Done; **Notification toast**; **Exercise Library modal** (search, group chips,
profile-filtered list, +/duplicate, create form: name/group/secondary/track/equipment); **Settings
modal** (appearance+opacity+wallpapers, startup toggles, notification steppers, export/import);
**Full-history chart modal** (area+line, gridlines, PB/current/gain). *Deps:* B16,B17. *Test:* session
log/switch/Done callbacks, progress counts; toast actions; library search/filter/create; settings
controls; chart geometry.

**B23 · App Bootstrap & Wiring** — `TS/React + Rust glue, integration` — `App.tsx` mounts store +
shell + screens + modals; subscribes native events (idle/tray) → store; 1 s tick loop; startup
(hydrate, theme, minimized); `src-tauri/src/main.rs` registers B11–B13, plugins, tray, window. *Deps:*
all. *Test:* boot sequence (hydrate→render), tick wiring, native-event→action mapping, screen routing,
modal open/close routing. (Heavier validation in IT3/IT4.)

### Integration suites

- **IT1 · Domain E2E (TS):** program → schedule → session(log several sets, jump) → coverage/analytics
  → export → import → identical state. Drift over a simulated week. 100% of the *interaction paths*.
- **IT2 · Persistence + IPC (Rust):** real in-memory/temp SQLite through B13 commands: load_all after
  saves, append history + query analytics inputs, export/import replace-all round-trip.
- **IT3 · Frontend↔Backend (TS):** store ↔ B14 ↔ (contract-mocked B13) — every command exercised with
  shape assertions; plus a real-invoke smoke when Tauri present. Guarantees DTO contracts match.
- **IT4 · App E2E (tauri-driver + WebdriverIO):** launch the built app; journeys: nudge fires → session
  → log set → donut/coverage update → persists across relaunch; plan edit → coverage rail updates;
  progress reflects logged history; theme/settings; export/import. The "fully working" gate.

---

## 4. Coverage & "tests-first, all-red" mechanics

1. **Phase 0 (me):** scaffold repo, tooling, vendored assets, **typed skeletons** for every block
   (signatures from §3, bodies throw), and an `AGENT.md` in every code dir, test dir, and integration
   dir containing: block spec, exact interface, design refs (token values, prototype behavior, file:line
   pointers into the handoff), enumerated test cases, coverage target, and **boundaries** ("only edit
   files under this dir; tests are read-only"). Configure vitest/llvm-cov with **100% thresholds** and a
   CI script `pnpm test:all` + `cargo test`.
2. **Phase 1 — Test agents (sonnet, parallel, one per block):** write real tests against the frozen
   skeleton signatures. Exit criterion: tests run, **all fail** (skeletons throw), and `--coverage`
   reports **100%** of that block's `src/` (every line/branch reachable). Not stubs — each test asserts
   concrete expected values.
3. **Phase 2 — Code agents (sonnet, parallel, one per block):** RW its `packages/<b>/src` (or crate),
   **read-only** its `tests/<b>`. Implement until its suite is 100% green at 100% coverage. May not
   touch the test files or other blocks' code.
4. **Phase 3 — Integration test agents:** write IT1–IT4 (fail initially).
5. **Phase 4 — Integration/wiring agents:** implement B23 glue + fix cross-block contract gaps until
   IT1–IT4 green.
6. **Phase 5 (me):** `pnpm build` + `cargo build` + `tauri build`, run IT4, smoke the real app.

Dependency-ordered waves so a block's deps are green before it codes (B01 → B02 → B03–B10 → B11–B14 →
B15 → B16/B17 → B18–B22 → B23 → IT). Test-writing waves can run fully parallel (skeletons exist for
all).

---

## 5. Git & Scaffolding (Phase 0 deliverables)

- `git init`, set `user.name="Mohammad Ewais"`, `user.email="mohammad.a.ewais@gmail.com"`, remote
  `git@github.com:mewais/Nabd.git`, branch `main`, `.gitignore`.
- Root configs: pnpm workspace, cargo workspace, `tsconfig.base`, `vitest.workspace.ts`, ESLint/Prettier,
  rustfmt/clippy, `LICENSE` (MIT for our code) + `NOTICE` (body-muscles Apache-2.0, free-exercise-db
  public-domain attributions), `ARCHITECTURE.md` (this plan, trimmed), CI script.
- Vendor body-muscles SVG paths → `assets/body/{front,back}.ts`; fetch + commit raw free-exercise-db
  snapshot under `packages/B02-dataset/data/source/` for the pipeline (re-tag run produces the bundled
  `exercises.json`, done by the B02 coding agent and validated by B02 tests).
- All skeletons + all `AGENT.md`s.

---

## 6. What you do vs. what I do

- **I do:** Phase 0 fully (scaffold, skeletons, AGENT.md, git+remote, vendor assets), then orchestrate
  Phases 1–5 by spawning sonnet agents per block/wave, gating on green+100% coverage between waves,
  and final build/run.
- **You do:** authenticate is already done (remote created). Restrict each agent's filesystem access to
  its dir if you wish (the AGENT.md boundaries + my orchestration already enforce scope). Visual QA at
  the end.

Outcome: a buildable Tauri app where every block is independently tested at 100%, integration + E2E are
green, and all functionality works.
