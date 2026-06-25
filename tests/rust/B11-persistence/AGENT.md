# Test agent — B11-persistence (Rust)

You write the tests for **nabd-persistence**. Read `docs/AGENTS_GUIDE.md`, then the
full spec at `src-tauri/crates/B11-persistence/AGENT.md`.

- Write real, value-asserting Rust tests into `tests/rust/B11-persistence/main.rs`
  (one integration test binary; use modules/helpers as needed). Cover every case in
  the spec's Test Cases section, including the error-path coverage.
- The crate is `nabd_persistence`; import its public API. The skeleton's functions
  `unimplemented!()` (except open_memory/open_at), so against it your tests are RED.
- You may ONLY edit files under `tests/rust/B11-persistence/`.

Run / gate:
```
cargo test -p nabd-persistence --manifest-path src-tauri/Cargo.toml
cargo llvm-cov --manifest-path src-tauri/Cargo.toml -p nabd-persistence --summary-only
```
Against the skeleton: tests RED (panic "not implemented") and coverage 100% regions/
functions/lines for src/** (every public fn invoked).
