# B23 · @nabd/app — runnable Tauri app (frontend wiring + Rust binary)

This block ASSEMBLES everything into a working app. It is mostly integration glue +
Tauri FFI, so it is validated by `vite build` (frontend typechecks+bundles), `cargo
build` (binary compiles), and the IT4 E2E suite + manual QA — NOT by 100% unit tests.
NO STUBS: every wired action must call the real store/command; native features must
be real.

## Part A — Frontend wiring (packages/B23-app/src)

### main.tsx
- Create the store: `createNabdStore({ client: defaultClient(), library: defaultLibrary(),
  now: () => new Date(), newId: () => "i" + Math.random().toString(36).slice(2, 9) })`
  (import defaultClient from @nabd/ipc-client, defaultLibrary from @nabd/dataset).
- Render `<App store={store} />` into #root via React 18 createRoot.

### App.tsx — wire store → screens/modals (use `useStore` from "zustand" with the vanilla store)
- On mount: `store.getState().hydrate()`; start a 1s interval calling `tick()`; add
  window listeners (mousemove/mousedown/keydown/wheel/touchstart) → `resetIdle()`;
  clean up on unmount.
- Read state via `useStore(store, s => …)`. Build view-models with the screen packages'
  builders + engines, and render:
  - `AppLayout` (from @nabd/shell) with `Sidebar` (screen, onNavigate=setScreen, donut
    from slots: setsDone=Σdone, setsTotal=Σsets, pct, caption) and `TopBar` (greeting via
    shell.greeting(now.getHours()), formatDate/formatClock/formatDuration(secondsToNext|
    idleSeconds), idleActive = idleSeconds≥0.6*idleNudge, notifActive=!!notif, theme,
    onTheme=setTheme, onOpenSettings=openSettings).
  - Screen switch on `screen`:
    - today → `TodayScreen` (build hero via today.buildHero(currentSlot, suggestionStr,
      note, setsTotal) where currentSlot = scheduling.currentSlot(slots) and suggestion via
      progression.suggest; rhythm = today.buildRhythmRows(slots); coverage; insight via
      coverage.insight → names; stats; callbacks → startNext/snooze/openActive(id)/
      setMapView/setMapStyle).
    - planner → `PlannerScreen` (program, library = defaultLibrary().withCustom(customExercises),
      profile, profiles=GYM_PROFILES, activeProfileId, profileMenuOpen, editDayId=planEditDay,
      volumeBars via coverage.computePlanVolume + planCoverage, coverage; cb bag → the store's
      plan* actions and planEdit/planSetNotes; onAddExercise/onAddPool → libOpen(target)).
    - progress → `ProgressScreen` (history, coverage, now, plannedPerWeek/Day from program,
      exNames from library, tab=progTab, onTab=setProgTab, onOpenChart=openProgChart).
  - Modals (render when active):
    - `SessionModal` when activeSession (list = modals.buildSessionList(slots, activeSession.slotId),
      setOfLabel "Set <done+1> of <sets>", onPick=switchExercise, onStepReps/onStepWeight,
      onLog=logSet, onClose=closeActive).
    - `NotificationToast` when notif (reasonLabel=notif.label, exercise, sub, onConfirm=
      confirmNotif, onSnooze=snooze).
    - `SettingsModal` when settingsOpen (settings, theme, all setters, onExport=exportData
      → trigger download, onImport → file picker → importData, onClose=closeSettings).
    - `LibraryModal` when lib.open (build its props from lib state + library filtered by
      active profile; callbacks → lib* store actions).
    - `FullHistoryChartModal` when progExercise!=null (vm = modals.buildChartVM(...) from the
      selected exercise's history series; onClose=closeProgChart).
- Apply theme: ThemeProvider/themeVars handled inside AppLayout (pass theme/opacity/wallpaper).

### Verify: `cd /work/mewais/Nabd && pnpm --filter @nabd/app build` must typecheck + bundle.

## Part B — Rust binary (src-tauri/src)

### src/lib.rs (run()) + src/main.rs (calls nabd_lib::run())
- Manage a SQLite connection: open at the app data dir ("nabd.sqlite"), `nabd_ipc::init`.
  Wrap in a Mutex in Tauri state.
- `#[tauri::command]` wrappers delegating to nabd_ipc (B13): `init`, `load_all`,
  `save_singleton`, `append_set`, `export_data`, `import_data` — each locks the conn and
  maps IpcError to a String error. Names + args MUST match @nabd/ipc-client's contract
  (load_all→String, save_singleton{key,value}, append_set{rowJson}, import_data{json}).
- Native commands: `notify{reason,exercise}` (build payload via nabd_native::notif_payload,
  show via tauri-plugin-notification), `set_vibrancy{opacity}` (window-vibrancy apply on the
  main window; alpha via nabd_native::vibrancy_alpha), `get_idle_seconds` (user-idle crate).
- Real OS features: system tray with a menu built from nabd_native::tray_items (Open/Pause/
  Start/Quit handlers); register tauri-plugin-autostart + tauri-plugin-single-instance;
  apply vibrancy on startup when translucent.
- `.invoke_handler(tauri::generate_handler![...all commands...])`.

### Verify: `cargo build --manifest-path src-tauri/Cargo.toml` compiles.

## Boundaries
Frontend agent: edit only packages/B23-app/. Rust agent: edit only src-tauri/src/ (+ may
adjust src-tauri/capabilities if a plugin permission is missing). Do not change other
packages' public APIs; if a needed selector/action is missing, report it (don't hack around).
