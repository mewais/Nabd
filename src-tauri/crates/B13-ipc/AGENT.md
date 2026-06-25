# B13 · nabd-ipc — IPC command-core (Rust)

Interface frozen in `src/lib.rs` (+ `src/error.rs`, implemented infra). Pure command
handlers over a `&Connection`, delegating to `nabd_persistence` (B11). No Tauri deps;
the `#[tauri::command]` wrappers live in B23. Test against an in-memory DB.

## Behavior
- `init(c)`: `db::init_schema(c)` mapped to IpcResult.
- `load_all(c)`: returns a JSON object string:
  `{ "program": <val|null>, "settings": <val|null>, "theme": <val|null>,
     "customExercises": <val|null>, "rotationState": <val|null>,
     "dayState": <val|null>, "history": [<LoggedSetRow>...] }`
  where each singleton is the raw stored JSON parsed back in (so it nests as JSON,
  not a string) or `null` if absent; history from `db::all_history`.
- `save_singleton(c, key, value)`: if `key` ∉ db::KV_KEYS → `Err(IpcError::BadKey)`;
  if `value` is not valid JSON → `Err(IpcError::BadJson)`; else `db::set_kv`.
- `append_set(c, row_json)`: parse to `LoggedSetRow` (BadJson on failure) →
  `db::append_history`.
- `export_data(c)`: same shape as load_all but wrapped as the AppData envelope:
  `{ "app":"Nabd", "version":1, "program":..., ... , "history":[...] }`.
- `import_data(c, json)`: parse object (BadJson on failure); for each present
  singleton key in KV_KEYS upsert its JSON; if `history` present, `db::replace_history`
  with the parsed rows. Missing keys are skipped (partial allowed).

## Test Cases (tests/rust/B13-ipc/main.rs)
Real value-asserting tests (red vs skeleton via unimplemented panic), against
`db::open_memory()` + `init`:
- init then load_all on empty DB → all singletons null, history [].
- save_singleton valid (e.g. "theme", "\"dark\"") then load_all shows theme:"dark";
  save_singleton bad key → BadKey; bad json value → BadJson.
- append_set valid row → load_all history has it (round-trip fields); bad json → BadJson.
- export_data → has app:"Nabd", version:1, and reflects saved singletons + history.
- import_data full doc → singletons + history applied (load_all reflects);
  partial doc (only program) → only program set, others untouched; bad json → BadJson;
  history replaced (pre-existing cleared).
- error.rs: construct/Display BadKey, BadJson, Storage; exercise From<persistence::Error>
  and From<serde_json::Error> (these tests are GREEN — error.rs is implemented infra).

## Coverage gate
`cargo llvm-cov --manifest-path src-tauri/Cargo.toml -p nabd-ipc --summary-only`
→ 100% regions/functions/lines for src/** (lib.rs + error.rs). 100% enforced at the
code phase (stateful crate; behavior tests need init first).

## Boundaries
Code agent: only `src-tauri/crates/B13-ipc/src/`. Test agent: only
`tests/rust/B13-ipc/`. No signature changes. No #[should_panic] for behavior.
