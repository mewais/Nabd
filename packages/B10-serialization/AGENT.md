# B10 · @nabd/serialization — import/export (pure)

Interface frozen in `src/index.ts`. Prototype refs: `exportData` (~L1313-1319),
`importData` (~L1320-1330). Use `AppDataSchema` from `@nabd/domain`.

## Behavior
- `serialize(input)`: `{app:"Nabd", version:APPDATA_VERSION, exportedAt,
  program, customExercises, settings, theme, history, rotationState}`.
- `serializeToJson(input)`: `JSON.stringify(serialize(input), null, 2)`.
- `deserialize(value)`: validate with `AppDataSchema.safeParse`. On success run
  `migrate`, then return `{ok:true, data, errors:[]}` where `data` contains ONLY
  the present known fields (program, customExercises, settings (merged-partial),
  theme, history, rotationState). On failure `{ok:false, data:{}, errors:[…]}`.
  Unknown/extra fields ignored; never throws.
- `deserializeJson(json)`: try `JSON.parse`; parse error → `{ok:false,data:{},
  errors:["invalid json"]}`; else `deserialize`.
- `migrate(data)`: bring older `version` up to current (currently identity for
  v1; structure the function so new versions slot in). Always stamps current
  version.

## Test Cases
- serialize round-trips through deserialize to equal input (same program/
  settings/etc.).
- serializeToJson is 2-space-indented and re-parses.
- deserialize: valid full doc ok; partial doc (only program) ok with just that
  field; wrong `app` → ok:false; missing version → ok:false; extra junk fields
  ignored; settings partial merged.
- deserializeJson: bad JSON → ok:false errors; good JSON → delegates.
- migrate: v1 identity; version stamped.

## Boundaries
Code agent edits only `packages/B10-serialization/`. Tests RO.
