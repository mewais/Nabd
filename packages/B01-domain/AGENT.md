# B01 · @nabd/domain — types, schemas, constants (CONTRACT, already implemented)

This block is **already implemented** by the architect and is the contract every
other block imports. **Code agents: do not modify it.** Only a test agent runs
here, to lock its invariants.

## Interface
See `src/index.ts` (re-exports muscles, equipment, tracking, exercise, program,
runtime, settings, theme-tokens, regions, appdata). Zod schemas are paired with
inferred TS types.

## Test Cases (test agent)
Cover `src/**` to 100% by asserting:
- **muscles.ts**: `MUSCLES.length===23`; no duplicates; `MUSCLE_NAMES` has a key
  for every muscle; `MUSCLE_GROUPS.length===12`; every `GROUP_PRIMARY_MUSCLE`
  value ∈ MUSCLES; every `GROUP_MUSCLES[g]` entry ∈ MUSCLES and includes the
  group's primary; `MuscleKeySchema` accepts a valid key, rejects `"pecs"`.
- **equipment.ts**: `EQUIPMENT_KEYS.length===11`; `EQUIPMENT_NAMES` complete;
  every `GYM_PROFILES[].equipment` entry ∈ EQUIPMENT_KEYS; schema accept/reject.
- **tracking.ts**: 8 keys; `TRACK_NAMES` complete; `isWeighted`/`isTimeBased`
  correct for each of the 8 (e.g. weight_reps→weighted true,time false;
  duration→time true; bodyweight_reps→both false); set membership.
- **exercise.ts**: valid exercise parses; missing primary rejected; bad muscle
  rejected; `ExerciseListSchema` on array.
- **program.ts**: valid SetSpec/Prescription/CycledSlot/Day/Program parse;
  weekday out of 0–6 rejected; enums (RepMode/Intensity/SetType/ProgramType/
  Schedule) accept valid + reject invalid.
- **runtime.ts**: Slot/LoggedSet/DayState parse valid + reject invalid status/
  trigger; CoverageSchema/RotationStateSchema accept maps.
- **settings.ts**: DEFAULT_SETTINGS parses against SettingsSchema; opacity/
  interval/idleNudge out-of-range rejected; DEFAULTS values present.
- **theme-tokens.ts**: THEMES has translucent/light/dark, each with the same key
  set incl. `--accent`,`--bg`,`--surface`; WALLPAPERS has 4 keys.
- **regions.ts**: `MUSCLE_REGION_MAP` has all 23 muscles; every value is a
  non-empty string[]; keys are exactly MUSCLES.
- **appdata.ts**: minimal `{app:"Nabd",version:1}` parses; wrong `app` rejected;
  partial settings allowed.

## Boundaries
Test agent edits only `tests/B01-domain/`. No source changes anywhere.
