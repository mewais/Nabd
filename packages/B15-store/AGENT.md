# B15 · @nabd/store — application store (front/back integration brain)

Interface frozen in `src/index.ts`. A vanilla zustand store created by
`createNabdStore(deps)` where `deps = { client: IpcClient, library: Library,
now: () => Date, newId: () => string }`. Owns state, mutates it via the pure
engines, and **persists via the client**. This is the integration seam — NO
action may be a silent no-op.

## Wiring rules (the anti-stub contract — tests assert these)
- **hydrate()**: `await client.init()`, then `client.loadAll()`; populate program/
  settings/theme/customExercises/rotationState/floatingIndex/history from the
  snapshot (fall back to seedProgram()/DEFAULT_SETTINGS when null); resolve today's
  day (B04 resolveTodayDay) and `buildSlots` + `applyStatuses`; compute coverage
  from history (B03 coverageFrom7dHistory); set `booted=true`.
- **Persistence after every relevant mutation** (call the client; tests verify):
  - program changes → `client.saveSingleton("program", program)`
  - settings changes → `saveSingleton("settings", settings)`
  - theme → `saveSingleton("theme", theme)`
  - customExercises → `saveSingleton("customExercises", customExercises)`
  - rotationState → `saveSingleton("rotationState", rotationState)`
  - dayState (slots/floatingIndex) when it changes materially → `saveSingleton("dayState", …)`
  - **logSet** → `client.appendSet(loggedSet)` AND update slots+coverage+history.
- Engines do the computing; the store never re-implements engine logic.

## Action behavior (delegate to the named engine)
- tick → B07 `tick` (with currentSlot from B04); raise notif; on timer/idle. resetIdle/snooze → B07.
- startNext → openActive(currentSlot.id); confirmNotif → openActive(notif.slot.id) + clear notif.
- openActive(slotId) → B06 `openSession`; switchExercise → B06; stepReps/stepWeight → B06.
- logSet(trigger="manual") → B06 `logSet`: update slots, bump coverage (B03 applySetDelta),
  append to history, build loggedSet (id=newId(), ts=now().toISOString(), date), call
  client.appendSet, reset timer (B07 resetTimer), advance session/allDone. closeActive → clear.
- setTheme/setOpacity/setWallpaper/setSetting/setInterval/setIdleNudge → update settings(+theme) & persist.
- planner actions → delegate to B09 program-editor (setType needs library lookup), then persist program.
  planSetProfile → set activeProfileId (persist? it's part of settings-ish; store in settings or a kv —
  persist via saveSingleton("settings",…) if you fold it in, else skip persistence and document).
  planEdit dispatches op→B09 fn (setRepMode/setIntensity/setRest/addSet/addWarmup/removeSet/
  cycleSetType/stepRep/stepVal). After any plan edit, recompute the planner coverage is the screen's job
  (not the store).
- library modal actions → manage `lib` state; libPick adds to ex/pool via B09 + closes; libCreate builds
  an Exercise (custom:true) via library/domain, appends to customExercises, persists, then libPick(id).
- progress: setProgTab/openProgChart/closeProgChart → ui flags.

## Test Cases (use a fake IpcClient = object of vi.fn()s; fixed now; deterministic newId)
- hydrate: with a snapshot → state populated (program/settings/theme/history/coverage/slots),
  booted true, client.init + loadAll called; with null snapshot → seed defaults.
- each persistence rule: perform the action, assert the corresponding client.saveSingleton(key, value)
  call with correct key + value; logSet asserts client.appendSet called with the logged set (correct
  exId/value/weight/trigger/date from fixed now) AND slots/coverage/history updated.
- tick: timer→0 raises notif; idle≥threshold raises idle notif; busy (session/notif) suppresses.
- session flow: startNext → activeSession set; logSet increments slot.done, advances; switchExercise;
  stepReps/stepWeight; closeActive clears.
- theme/settings setters update + persist; setInterval/setIdleNudge clamp via domain ranges.
- planner: planAddDay/RemoveDay/Rename/SetWeekday/SetType(fixed↔cycled)/AddExercise/RemoveExercise/
  ToggleSuperset/AddSlot/RemoveSlot/RemoveFromPool/planEdit each op/planSetNotes → program changes
  (spot-check) AND saveSingleton("program") called.
- library: libOpen/Close/Search/Group/StartCreate/CancelCreate/Draft/ToggleSecondary/Pick/Create →
  lib state + (Create) customExercises persisted.
- nav/view: setScreen/setMapView/setMapStyle/setProgTab/openProgChart/closeProgChart/toggleProfileMenu.
Cover every action + branch → 100%.

## Boundaries
Code agent: only `packages/B15-store/src/`. Tests RO. Import @nabd/domain + all engine
packages + @nabd/ipc-client + @nabd/dataset + zustand. Do not re-implement engine logic.
No signature changes.
