# B14 · @nabd/ipc-client — typed Tauri IPC wrappers

Interface frozen in `src/index.ts`. The store (B15) uses `IpcClient`. A transport
(`Invoke`) is injected so tests need no Tauri runtime.

## Command contract (B23 must register these `#[tauri::command]`s)
| method | cmd name | args | returns |
|---|---|---|---|
| init | `init` | — | void |
| loadAll | `load_all` | — | JSON string → parsed BootSnapshot |
| saveSingleton | `save_singleton` | `{ key, value }` (value = JSON string) | void |
| appendSet | `append_set` | `{ rowJson }` (JSON string of LoggedSet) | void |
| exportData | `export_data` | — | JSON string |
| importData | `import_data` | `{ json }` | void |
| notify | `notify` | `{ reason, exercise }` | void |
| setVibrancy | `set_vibrancy` | `{ opacity }` | void |
| getIdleSeconds | `get_idle_seconds` | — | number |

## Behavior
- `createIpcClient(invoke)`: returns an IpcClient whose methods call `invoke(cmd,
  args)` per the table.
  - **`loadAll`**: `load_all` returns a **single JSON string** (exactly what the
    Rust B13 `load_all` produces). Do ONE `JSON.parse` on it. The parsed object's
    singleton fields (`program`, `settings`, `theme`, `customExercises`,
    `rotationState`, `dayState`) are **already nested objects/values** (or JSON
    `null`) — do NOT parse them again. `history` is already an array. Return
    `{ program: parsed.program ?? null, …, history: parsed.history ?? [] }`.
  - `saveSingleton(key, value)`: send `{ key, value: JSON.stringify(value) }`.
  - `appendSet(row)`: send `{ rowJson: JSON.stringify(row) }`.
- `isTauri()`: `typeof window !== "undefined" && "__TAURI_INTERNALS__" in window`.
- `tauriInvoke()`: returns an Invoke that, when `isTauri()`, calls the dynamically
  imported `@tauri-apps/api/core` invoke; otherwise returns an Invoke that rejects
  with an Error("tauri unavailable"). (Test by faking window.)
- `defaultClient()`: `createIpcClient(tauriInvoke())`.

## Test Cases
Use a fake `Invoke` (a vi.fn returning canned values) to assert each method calls
the correct cmd name + args and maps results:
- loadAll: invoke("load_all") resolves to a JSON **string** (e.g.
  `JSON.stringify({program:{…}, settings:{…}, theme:"dark", customExercises:null,
  rotationState:null, dayState:null, history:[…]})`); loadAll does ONE JSON.parse
  and returns BootSnapshot with singletons as the nested objects (NOT re-parsed),
  history as the array, missing → null/[]. Test both a populated and an all-null
  snapshot.
- saveSingleton("theme", "dark") → invoke("save_singleton", {key:"theme",
  value:'"dark"'}) (value JSON-stringified).
- appendSet(row) → invoke("append_set", {rowJson: JSON.stringify(row)}).
- exportData → returns invoke string. importData(json) → invoke("import_data",{json}).
- init/notify/setVibrancy/getIdleSeconds → correct cmd + args + return.
- isTauri true when window.__TAURI_INTERNALS__ set, false otherwise.
- tauriInvoke: when not tauri, the returned Invoke rejects with "tauri unavailable".
  (For the tauri branch, set a fake window.__TAURI_INTERNALS__ and stub the dynamic
  import if feasible; at minimum cover the isTauri()-false rejection path and the
  branch selection.)
- defaultClient returns an object with all IpcClient methods.

## Boundaries
Code agent: only `packages/B14-ipc-client/src/`. Tests RO. Import only @nabd/domain
+ (dynamically) @tauri-apps/api. No signature changes.
