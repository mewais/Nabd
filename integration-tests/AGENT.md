# Integration tests — Nabḍ

Cross-block suites. Unlike block tests (written against skeletons), these run against
the FULLY IMPLEMENTED system and must PASS — if one fails, it has found a real
integration bug (report it precisely; the orchestrator fixes the offending block).

Run: `cd /work/mewais/Nabd && npx vitest run -c integration-tests/vitest.config.ts`

## IT1 — domain + store end-to-end (TS) → integration-tests/IT1-domain-e2e/
Build an in-memory `IpcClient` that faithfully mirrors the Rust B13 semantics:
- keep an object of singleton JSON strings + a history array
- `loadAll()` → returns a parsed BootSnapshot equivalent (the ipc-client expects a JSON
  STRING from invoke("load_all"); but here you implement IpcClient directly, so return the
  BootSnapshot object: {program,settings,theme,customExercises,rotationState,dayState,history})
- `saveSingleton(key,value)` stores structuredClone(value); `appendSet(row)` pushes;
  `exportData()`/`importData()` round-trip; `init()` no-op.
Then drive `createNabdStore({client, library: defaultLibrary(), now: fixed, newId: counter})`
through real journeys and assert end-to-end:
1. hydrate → program seeded, today slots built (scheduling), currentSlot present, coverage
   from history.
2. openActive(currentSlot) → logSet (manual): slot.done increments, coverage bumps,
   history grows, client.appendSet called with the right row, dayState persisted.
3. log a slot to completion → status done, session advances to next pending.
4. "restart": construct a NEW store over the SAME in-memory client; hydrate → persisted
   program/settings/theme/history are restored (state survives).
5. plan edit: planSetType('cycled') then planEdit/addSlot etc → program persisted; cycled
   today build pulls a rotated exercise; advancing rotation drifts the exercise.
6. export → import round-trips program+settings+history through the store.
Assert concrete values throughout. (This suite has no coverage threshold; it's behavioral.)

## IT3 — frontend↔backend contract (TS) → integration-tests/IT3-frontend-backend/
1. With a spy `invoke` (vi.fn), drive `createIpcClient(spy)` through every method and assert
   the EXACT command name + arg object per the contract (load_all, save_singleton{key,value},
   append_set{rowJson}, export_data, import_data{json}, init, notify{reason,exercise},
   set_vibrancy{opacity}, get_idle_seconds).
2. Read the Rust binary source (src-tauri/src/lib.rs) as text and assert EVERY command the
   ipc-client calls is registered there (appears as a fn and in generate_handler!), and that
   snake_case arg names map to the camelCase the client sends (rowJson↔row_json etc.). This
   catches front/back drift at the seam.

## IT2 — persistence + IPC (Rust)
Covered by the B13 crate tests (nabd_ipc over a real in-memory SQLite: load_all/save/append/
export/import round-trips). No new suite required; note this here.

## IT4 — app E2E (tauri-driver) → integration-tests/IT4-app-e2e/
Scaffold a WebdriverIO + tauri-driver harness for the built `nabd` binary (launch → log a
set → assert donut/coverage update → relaunch persists). NOTE: requires a desktop display;
cannot run headless in CI here — document the runbook; the user runs it manually.
