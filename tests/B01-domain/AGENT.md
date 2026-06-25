# Test agent — B01-domain

You write the tests for **domain**. Read `docs/AGENTS_GUIDE.md` first, then the
full block spec at `packages/B01-domain/AGENT.md` (Rust: `src-tauri/crates/B01-domain/AGENT.md`).

- Implement every case in that spec's **Test Cases** section as real,
  value-asserting tests (no stubs).
- Import the block under test by its package name (e.g. `@nabd/domain`); the
  frozen signatures are in its `src/index.ts`.
- Against the skeleton your suite must be **all red** yet report **100%**
  coverage of the block's `src/**` (call every exported function).
- You may edit **only** files in this directory.

Run: `pnpm --filter @nabd/domain test:cov`
