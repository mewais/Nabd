# B09 · @nabd/program-editor — planner mutations + derived views (pure)

Interface frozen in `src/index.ts`. Every mutation returns a NEW Program (deep,
input untouched). Prototype refs: `p*`/`g*` methods (~L1052-1214): `pSetType`/
`pDeriveSlots` (L1089-1091), `pAddDay`/`pRemoveDay` (L1098-1099), `pAddExercise`
(L1101), `gRepMode`/`gIntensity`/`gAddSet`/`gAddWarmup`/`gRemoveSet`/`gCycleType`/
`gStepRep`/`gStepVal`/`gStepRest` (L1106-1115), `pToggleSuperset` (L1116),
slots (L1118-1120), board (L1186-1199), summary (L1208), `seedProgram` (L1056-1078).

## Key behavior
- `newId(seed?)`: deterministic id (e.g. `"i"+base36(seed)`); seed injectable so
  tests are deterministic.
- `setType(p,'cycled',lookup)`: for each day without slots, populate via
  `deriveSlots`; `setType(p,'fixed')` keeps exercises. `deriveSlots(day,lookup)`:
  group the day's exercises by `exercise.group`, one slot per group with `pool` =
  that group's exIds, prescription copied from the first exercise of the group.
- `addExercise(p,dayId,ex)`: append a prescription — `repMode = ex.timeBased ?
  'time':'range'`, `intensity:'none'`, `rest = timeBased?60:120`, 3 working sets
  (`{type:'working',a: timeBased?45:8, b: timeBased?undefined:12}`).
- `toggleSuperset(p,dayId,exRowId)`: link with the **next** exercise (shared new
  supersetId) or unlink if already linked to it; no-op if last.
- `setRepMode`: switching to `time` sets each set `a??=45`, drops `b`; to `fixed`
  drops `b`; to `range` ensures `b = a+2` when missing.
- `setIntensity`: `none` deletes `val`; `rpe`/`pct` set `val??=(rpe?8:70)`.
- `addSet`: clone last set as working. `addWarmup`: unshift a warmup (time→a 30,
  else a=firstA+2,b=firstA+4). `removeSet`: splice (keep ≥1). `cycleSetType`:
  working→warmup→drop→working.
- `stepRep`: `a` clamps min (time:5 else 1; time steps ×5; range keeps b≥a); `b`
  clamps ≥a. `stepVal`: rpe ±0.5 clamp 5–10; pct ±2.5 clamp 40–100. `stepRest`:
  ±15 clamp ≥0.
- `addSlot`/`removeSlot`/`addToPool`(no dup)/`removeFromPool`.
- `boardLayout(p,profile)`: weekday → 7 columns Mon..Sun (day card / rest / add);
  floating → day cards in order + an "add" column. Card chips: fixed→first ≤4
  exercise names (superset flag), cycled→first ≤4 group names; `more` = remainder.
- `daySummary(day,type)`: fixed→`"<n> exercises · <sets> sets · ~<min> min"`
  (`min = max(8, round(totalSets*3.4))`); cycled→`"<n> muscle groups"`.
- `seedProgram()`: the PPL seed (translate prototype `seedProgram` exId/sets to
  our Program shape; weekday Push=1,Pull=3,Legs=5; include the two supersets).

## Test Cases
One test per mutation asserting the new program AND input-unchanged:
- addDay/removeDay/renameDay/setWeekday (toggle off when same).
- setType fixed→cycled derives slots (grouping + pool + copied prescription);
  cycled→fixed; deriveSlots directly.
- addExercise time vs non-time defaults; removeExercise.
- toggleSuperset link + unlink + last-noop.
- setRepMode range/fixed/time transitions on b/a; setIntensity none/rpe/pct val.
- addSet/addWarmup(time vs reps)/removeSet(min1)/cycleSetType order.
- stepRep a/b clamps + time×5 + b≥a; stepVal rpe & pct clamps; stepRest ±15 ≥0.
- addSlot/removeSlot/addToPool dedupe/removeFromPool.
- boardLayout weekday (rest + add cells) and floating (+add); chips/more counts.
- daySummary fixed math + cycled.
- seedProgram passes ProgramSchema; 3 days; supersets present.

## Boundaries
Code agent edits only `packages/B09-program-editor/`. Tests RO.
