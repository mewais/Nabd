# B11 · nabd-persistence — SQLite store (Rust)

Interface frozen in `src/lib.rs` (+ `src/error.rs`). Singletons are opaque JSON
strings in a KV table (TS owns their structure); logged sets live in a queryable
`history` table. All functions take `&Connection` for testability.

## Schema (init_schema, idempotent)
- `app_meta(key TEXT PRIMARY KEY, value TEXT)` — store `("version", SCHEMA_VERSION)`.
- `kv(key TEXT PRIMARY KEY, value TEXT NOT NULL)` — singleton JSON blobs.
- `history(id TEXT PRIMARY KEY, ex_id TEXT, exercise TEXT, "group" TEXT,
  muscles TEXT /*json array*/, value REAL, weight REAL /*nullable*/, ts TEXT,
  date TEXT, trigger TEXT)`, index on `date`.

## Behavior
- `init_schema`: create tables/index if absent; upsert version. Safe to call twice.
- `schema_version`: read `app_meta.version` as i64; **0** if uninitialized (no row/table).
- `get_kv`/`set_kv` (upsert)/`delete_kv` (no-op if absent).
- `append_history`: insert one row (muscles serialized to JSON).
- `all_history`: all rows, `ORDER BY ts ASC` (deserialize muscles).
- `history_between(from,to)`: `WHERE date >= from AND date <= to ORDER BY ts ASC`.
- `clear_history`: delete all rows.
- `replace_history(rows)`: in ONE transaction, clear then insert all.
- Errors: surface rusqlite errors as `Error::Sqlite`, JSON as `Error::Json`.
- `open_memory`/`open_at` are already implemented (do not change).

## Test Cases (test agent → tests/rust/B11-persistence/main.rs)
Use `open_memory()` then `init_schema`. Assert with `assert_eq!`:
- init_schema idempotent (call twice, ok); schema_version == SCHEMA_VERSION after init;
  schema_version == 0 before init (fresh connection, no panic).
- set_kv then get_kv returns the value; get_kv missing → None; set_kv twice updates
  (upsert); delete_kv removes (get → None); delete_kv on absent key → Ok.
- KV_KEYS constant has the 6 expected keys.
- append_history then all_history returns the row equal to input (round-trip incl.
  muscles vec, null weight, non-null weight); ordering by ts across multiple rows.
- history_between inclusive boundaries (row on from/to date included; outside excluded).
- clear_history empties; replace_history replaces (pre-existing rows gone, new present)
  and is atomic.
- **Error coverage:** trigger `Error::Sqlite` (e.g. a query before init / constraint
  violation: insert duplicate id) and `Error::Json` (e.g. set_kv a value then corrupt
  path) — and exercise `Display` for each variant (`format!("{e}")`) so error.rs hits
  100%. The `#[from]` conversions are covered by `?` in the functions.

## Coverage gate
`cargo llvm-cov --manifest-path src-tauri/Cargo.toml -p nabd-persistence --summary-only`
→ 100% regions, functions, lines for `src/**` (lib.rs + error.rs). No FFI here.

## Boundaries
Code agent edits only `src-tauri/crates/B11-persistence/src/`. Test agent edits only
`tests/rust/B11-persistence/`. Do not change exported signatures.
