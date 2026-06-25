# Test agent — B07-nudge

You write the tests for **nudge**. Read `docs/AGENTS_GUIDE.md` first, then the
full block spec at `packages/B07-nudge/AGENT.md` (Rust: `src-tauri/crates/B07-nudge/AGENT.md`).

- Implement every case in that spec's **Test Cases** section as real,
  value-asserting tests (no stubs).
- Import the block under test by its package name (e.g. `@nabd/nudge`); the
  frozen signatures are in its `src/index.ts`.
- Against the skeleton your suite must be **all red** yet report **100%**
  coverage of the block's `src/**` (call every exported function).
- You may edit **only** files in this directory.

Run: `pnpm --filter @nabd/nudge test:cov`
