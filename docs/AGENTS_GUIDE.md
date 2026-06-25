# Nabḍ — Shared Agent Guide

Read this once, then your block's `AGENT.md`. It applies to every test, code, and
integration agent.

## The two-phase, no-cheating workflow

1. **Test agents** write tests FIRST, against the **frozen interface** in the
   block's `src/index.ts` (signatures + types are fixed; bodies throw
   `"not implemented"`). Tests assert **concrete expected values**, never stubs.
   Against the skeleton every test is RED, yet the suite must report **100%
   coverage** of the block's `src/**` (achieved by calling every exported
   function across your cases).
2. **Code agents** implement the bodies until the (read-only) test suite is
   **green at 100% coverage**. You may add private helper files under your
   `src/`, but you may **not** change the exported signatures, and you may **not**
   edit the tests.

## Hard boundaries (enforced)

- **Code agents:** edit only files under your block's code dir
  (`packages/<block>/src/**` or `src-tauri/crates/<block>/src/**`). The test dir
  is **read-only**. Do not touch other blocks.
- **Test agents:** edit only files under your block's test dir
  (`tests/<block>/**`). Do not edit any `src/`.
- Never edit `packages/B01-domain` (the contract) or `assets/` (vendored).
- Do not edit the shared root config, the generator, or another block.

## Coverage discipline (critical)

Because tests are frozen before code exists, **code must not contain branches the
tests don't exercise.** If the spec/tests don't demand a guard, don't add it.
Implement exactly the behavior the tests assert — no speculative error paths,
no dead code. This is how 100% branch coverage stays achievable.

Run your block's suite with coverage:

```
pnpm --filter @nabd/<name> test:cov         # TS blocks
cargo test -p <crate> && cargo llvm-cov -p <crate>   # Rust blocks
```

## Conventions

- TS: ESM, `strict`, no `any` unless unavoidable, prefer pure functions, immutable
  inputs (never mutate arguments). Match Prettier (`.prettierrc.json`).
- Determinism: no `Date.now()`/`Math.random()` inside pure engines — take `now`
  or an id-generator as a parameter (the signatures already do this).
- Import shared types/constants from `@nabd/domain`. Never redefine them.
- React (UI blocks): function components, props-driven, no data fetching; all
  state/handlers arrive via props (the store wires them). Use design-system
  primitives and theme CSS vars (`var(--accent)` etc.), never hard-coded colors.

## Source of truth for behavior

- `PLAN.md` §3 — your block's responsibility + interface summary.
- `design_handoff_nabd_workout_tracker/Nabd.dc.html` — exact UI markup, values,
  and logic (file:line pointers are in your AGENT.md).
- `design_handoff_nabd_workout_tracker/README.md` — documented behavior.
- `@nabd/domain` source — the authoritative types/constants.
