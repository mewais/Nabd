# B06 · @nabd/session — session reducer (pure)

Interface frozen in `src/index.ts`. Prototype refs: `openActive`/`loadIntoForm`
(~L1283-1291), `switchExercise` (~L1292-1296), `logSet`/`saveActive`
(~L1336-1377), `stepReps`/`stepWeight` (~L1332-1333). This is the NEW two-pane
one-set-per-log model.

## Behavior
- `openSession(slot, history)`: build ActiveSession from the slot + a suggestion
  (via `@nabd/progression.suggest` using `history(slot.exId)` and the slot's
  tracking-derived unit/weighted). `logged=[]`, `allDone=false`.
- `logSet(session, slots, history)`: record one set of the current exercise.
  Compute `setStr` (weighted→`"<v> · <w>kg"`; sec→`"<v>s"`; else `"<v> reps"`).
  Update the matching slot: `done=min(done+1, sets)`, `status= done>=sets ?
  "done":"now"`, `result = done>=sets ? "<sets>×<reps>[ · w]" : ""`. If it just
  completed, promote the first "upcoming" slot to "now". Build the next form: stay
  on same slot if it still has sets left; else next pending slot (suggest fresh);
  else `allDone=true`. Return `{slots, session, coverageMuscles:slot.muscles,
  logged:{exId,exercise,group,muscles,value,weight,trigger:"manual"}, receiptItem}`
  with the receipt appended.
- `switchExercise(session, slots, slotId, history)`: load that slot into a fresh
  form, **preserving** `session.logged`.
- `stepReps(session, delta)`: `reps = max(1, reps + (unit==="sec"?delta*5:delta))`.
- `stepWeight(session, delta)`: `weight = max(0, round((weight+delta*2.5)*10)/10)`.
- `applyCoverage(cov, muscles)`: delegate to coverage bump (+DEFAULTS.coveragePerSet).

## Test Cases
- openSession: fields from slot+suggestion; empty receipt.
- logSet single: done→1, status stays "now" when sets>1, receipt has 1 item,
  coverageMuscles = slot muscles, form stays same exercise.
- logSet completing: done reaches sets → status "done", result string set, next
  upcoming promoted to now, form advances to next pending.
- logSet last pending: allDone true.
- multi-set same exercise across calls; receipt accumulates.
- switchExercise: form swaps, logged preserved.
- stepReps reps vs sec (×5); floor at 1. stepWeight ±2.5 rounding; floor 0.
- weighted vs bodyweight setStr/result formatting.

## Boundaries
Code agent edits only `packages/B06-session/`. Tests RO.
