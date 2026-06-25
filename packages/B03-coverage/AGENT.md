# B03 · @nabd/coverage — coverage & volume engine (pure)

Interface frozen in `src/index.ts`. Prototype refs: `Nabd.dc.html` `pComputeVolume`
(~L1140), `pPlanCov` (~L1144), `partStyle`/legend `recommendation` (~L1519-1527),
`insight` (~L1528-1530), per-set bump +4 (`saveActive` ~L1357).

## Behavior
- `computePlanVolume(program, lookup)`: for each day — **fixed**: each exercise's
  working-set count (exclude `warmup`) adds full to each `primary` muscle, half to
  each `secondary`. **cycled**: each slot's working-set count adds full to
  `GROUP_PRIMARY_MUSCLE[slot.group]`. Sum across all days. Return only touched
  muscles.
- `planCoverage(volume)`: `pct = min(100, vol/16*100)` per muscle (16 = reference
  weekly sets).
- `coverageFrom7dHistory(history, now)`: count logged sets per muscle in the last
  7 days (primary full, secondary half — muscles already on each LoggedSet), then
  same saturation to 0–100.
- `applySetDelta(cov, muscles, perSet)`: return new cov with each muscle bumped by
  `perSet` (default DEFAULTS.coveragePerSet=4), clamped ≤100. Pure (no mutation).
- `recommendation(pct)`: `>=66`→"rest", `<=38`→"push", else "none".
- `insight(cov)`: sort muscles desc by coverage; `rest` = top 2, `push` = bottom 2.
- `emptyCoverage()`: every muscle → 0.

## Test Cases
- volume fixed: primary full + secondary half; warmups excluded; multiple
  exercises summed.
- volume cycled: slot sets → group primary muscle; mixed days.
- planCoverage saturation + clamp at 100.
- coverageFrom7dHistory: includes only last-7-day sets (boundary at exactly 7d),
  primary/secondary weighting.
- applySetDelta: bump + clamp 100; original unchanged.
- recommendation: 70→rest, 66→rest, 38→push, 20→push, 50→none.
- insight: correct top2/bottom2 ordering; ties stable.
- emptyCoverage: all 23 keys = 0.

## Boundaries
Code agent edits only `packages/B03-coverage/`. Tests RO. Use `@nabd/dataset`
only via the injected `lookup` (don't import the dataset directly).
