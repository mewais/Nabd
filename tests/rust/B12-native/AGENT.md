# Test agent — B12-native (Rust)

Write tests for this crate. Read `docs/AGENTS_GUIDE.md`, then the spec at
`src-tauri/crates/B12-native/AGENT.md`. Implement every Test Case as real value-asserting
Rust tests in `tests/rust/B12-native/main.rs` (replace the placeholder). NO #[should_panic]
for behavior — behavior tests call the real fn and assert the CORRECT value; against
the skeleton they fail via the unimplemented panic (RED), and pass once implemented.
error.rs construction/Display tests are GREEN. Edit ONLY this directory.

Gate:
  cargo test -p nabd-native --manifest-path src-tauri/Cargo.toml
  cargo llvm-cov --manifest-path src-tauri/Cargo.toml -p nabd-native --summary-only
