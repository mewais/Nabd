# Test agent — B21-progress

You write the tests for **progress**. Read `docs/AGENTS_GUIDE.md` first, then the
full block spec at `packages/B21-progress/AGENT.md` (Rust: `src-tauri/crates/B21-progress/AGENT.md`).

- Implement every case in that spec's **Test Cases** section as real,
  value-asserting tests (no stubs).
- Import the block under test by its package name (e.g. `@nabd/progress`); the
  frozen signatures are in its `src/index.ts`.
- Against the skeleton your suite must be **all red** yet report **100%**
  coverage of the block's `src/**` (call every exported function).
- You may edit **only** files in this directory.

Run: `pnpm --filter @nabd/progress test:cov`
