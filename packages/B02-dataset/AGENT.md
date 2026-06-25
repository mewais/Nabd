# B02 · @nabd/dataset — exercise library: re-tag pipeline + runtime accessors

Re-tags `data/source/free-exercise-db.json` (873 records) into our 23-muscle /
12-group / 11-equipment / 8-tracking model, merges the handoff seed, emits
`data/exercises.json`, and exposes runtime accessors. Interface frozen in
`src/index.ts`.

## Mapping rules (implement exactly; tests assert representative cases per branch)

**Equipment** (`normalizeEquipment`): `body only`→`bodyweight`, `dumbbell`→
`dumbbell`, `barbell`→`barbell`, `e-z curl bar`→`ezbar`, `kettlebells`→
`kettlebell`, `bands`→`bands`, `cable`→`cable`, `machine`→`machine`,
`exercise ball`/`medicine ball`→`bodyweight`, `foam roll`/`other`/`null`→`null`
(record dropped). `pullupbar`, `bench`, `smith` never come from this table — they
arise only from the seed or name heuristics below.

**Muscle** (`normalizeMuscle`, coarse→fine, may return several): `abdominals`→
`[abs]`, `lower back`→`[lower_back]`, `middle back`→`[rhomboids]`, `traps`→
`[upper_traps]`, `shoulders`→`[side_delts]`, `quadriceps`→`[quads]`, and identity
for `chest,lats,biceps,triceps,forearms,calves,glutes,hamstrings,abductors,
adductors,neck`. Unknown→`[]`.

**Group** (`normalizeGroup` from the primary source muscle): abdominals→Abs,
chest→Chest, lats/middle back/lower back→Back, traps→Traps, shoulders→Shoulders,
triceps→Triceps, biceps→Biceps, forearms→Forearms, quadriceps→Quads,
hamstrings→Hamstrings, glutes/abductors/adductors→Glutes, calves→Calves,
neck→Traps. Unknown→null (drop).

**refineMuscles(name, muscles)** — name lowercased, adjust delt/trap/oblique:
- contains `lateral raise`/`lat raise`/`side raise`→ replace side/shoulder with `side_delts`
- `front raise`/`overhead press`/`ohp`/`arnold`/`shoulder press`→ `front_delts`
- `rear`/`reverse fly`/`reverse pec`/`face pull`→ `rear_delts`
- `shrug`→ `upper_traps`; `oblique`/`twist`/`woodchop`/`side bend`→ add `obliques`
- `row`/`pulldown`/`pull-up`/`chin-up`→ add `rhomboids` (secondary)
Idempotent; returns deduped list.

**inferTracking(rec)**: name has `plank`/`hold`/`hollow`/`l-sit`/`wall sit`→
`duration`; `carry`/`farmer`→`weight_duration`; `run`/`sprint`/`bike`/`row` (erg)→
`distance_duration`; `pull-up`/`chin-up`/`dip` (bodyweight)→`weighted_bodyweight`;
`assisted`→`assisted_bodyweight`; equipment bodyweight & reps-style→
`bodyweight_reps`; else `weight_reps`.

**normalizeRecord**: combine the above into an `Exercise` (id = source id, primary
= refined first muscle group, secondary = remaining + secondaryMuscles mapped;
timeBased = isTimeBased(tracking)); return null if equipment or group unmappable.

**mergeAndDedupe(seed, imported)**: seed entries win on id collision and on
case-insensitive name collision; result sorted by group then name.

**buildDataset(rawFreeDb, seed)**: parse raw → normalizeRecord each (drop nulls)
→ mergeAndDedupe(seed, …) → validate every entry with `ExerciseSchema`.

**seed()**: returns the handoff `exercises.js` (~85) hand-re-tagged to the new taxonomy
(see `design_handoff_nabd_workout_tracker/exercises.js`; old keys back→lats,
lowerBack→lower_back, shoulders→split by name, etc.). Each must satisfy
`ExerciseSchema`.

**exercises()**: returns `buildDataset` output, also written to `data/exercises.json`
(commit it). Provide a `tools/build-dataset.ts` runner.

**Accessors** (`createLibrary`): `all` returns input; `byId`; `search` =
case-insensitive substring on name; `byGroup`; `filterByProfile(eq)` keeps
exercises whose `equipment ∈ eq` OR `custom`; `musclesOf` = primary∪secondary
deduped; `withCustom` returns a new Library over `[...base, ...custom]`.
`defaultLibrary()` = `createLibrary(exercises())`.

## Test Cases
- equipment map: one case per branch incl. null-drops (`foam roll`,`other`,null).
- muscle map: each coarse term incl. `middle back`→rhomboids, `shoulders`→side_delts, unknown→[].
- group map: each branch incl. glutes-family→Glutes, neck→Traps, unknown→null.
- refineMuscles: lateral raise→side_delts; OHP→front_delts; face pull→rear_delts;
  shrug→upper_traps; russian twist→+obliques; barbell row→+rhomboids; idempotent.
- inferTracking: plank→duration; farmer carry→weight_duration; pull-up→
  weighted_bodyweight; assisted pull-up→assisted_bodyweight; push-up→
  bodyweight_reps; barbell bench→weight_reps.
- normalizeRecord: a full record maps correctly; unmappable equipment→null.
- mergeAndDedupe: seed wins on id + on name collision; sorted order.
- buildDataset on the real source: returns ≥300 entries, **all** pass
  ExerciseSchema, no duplicate ids (golden invariants).
- seed(): every entry passes ExerciseSchema; count ≥80; specific spot-checks
  (e.g. `bb-bench`→group Chest, primary chest, tracking weight_reps).
- accessors: byId hit/miss; search case-insensitive; byGroup; filterByProfile
  keeps custom + in-profile, drops out-of-profile; musclesOf dedupes; withCustom
  includes customs.

## Boundaries
Code agent edits only `packages/B02-dataset/` (incl. `data/`, `tools/`). Tests RO.
