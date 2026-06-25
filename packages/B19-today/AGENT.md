# B19 · @nabd/today — Today screen (React)

Interface frozen in `src/index.ts`. Pure builders + presentational components using
@nabd/design-system + @nabd/bodymap. Prototype refs: Today markup Nabd.dc.html
~L96-204 (hero ~L101-129, rhythm ~L131-148, coverage card ~L152-179, volume insight
~L181-196, stat tiles ~L198-202). Tests assert behavior/DOM/values, not pixels.

## Builders
- `buildLegend(coverage, muscles?)`: default muscles = ['chest','back','shoulders',
  'biceps','quads','glutes','abs','calves'] (prototype legendKeys but in our taxonomy —
  use 'lats'? NO: use display muscles ['chest','lats','side_delts','biceps','quads',
  'glutes','abs','calves']). For each: `{muscle, name: MUSCLE_NAMES[m], pct:
  coverage[m]||0, rec: recommendation(pct)}` (import recommendation from @nabd/coverage:
  >=66 rest, <=38 push, else none).
- `buildRhythmRows(slots)`: per slot → `{id, timeStr, exercise, sub: "<group> · <muscle
  names joined ', '>", status, badge: done→result, now→"Now", skipped→"Skipped",
  upcoming→ (done>0 ? "<done>/<sets> sets" : "—"), dotColor: done→var(--accent2)/
  now→var(--accent)/else var(--text3), canStart: status==='now'||'upcoming',
  isNow: status==='now'}`.
- `buildHero(currentSlot, suggestion, note, setsTotal)`: null slot → {allDone:true,...
  empties}. Else {allDone:false, kicker: (status==='now'?'UP NEXT · ':'LATER · ')+
  timeStr, exercise, group, muscleNames (MUSCLE_NAMES), suggestion, note, setsTotal}.

## Components (use design-system Button/Segmented/Card/Pill/Badge + bodymap BodyMap/MuscleBar)
- `HeroCard`: when allDone → "Day complete" state; else kicker/exercise/muscle chips/
  AI-suggestion row/Start+Snooze buttons (onStart/onSnooze).
- `RhythmCard`: header "Today's rhythm" + "<done> / <total> done"; one row per RhythmRow
  (time, status dot, exercise+sub, badge, Start button when canStart → onStart(id)).
- `CoverageCard`: Map view Segmented (Both/Front/Back) + style Segmented (Heat/Outline);
  BodyMap front/back per view; per-muscle MuscleBars from buildLegend.
- `VolumeInsightCard`: "Rest these — <rest joined> …" / "Push these — <push joined> …".
- `StatTiles`: three tiles (streak/weekSets/volume).
- `TodayScreen`: composes the above in the two-column layout; wires callbacks.

## Test Cases
- buildLegend: rec thresholds (a muscle at 70→rest, 20→push, 50→none); names; default set length.
- buildRhythmRows: each status → correct badge/dot/canStart/isNow; upcoming with done>0 → "1/3 sets".
- buildHero: null→allDone; now vs later kicker; muscle names.
- HeroCard: renders exercise + suggestion; Start→onStart, Snooze→onSnooze; allDone shows "Day complete".
- RhythmCard: renders N rows; Start on a row calls onStart(that id); done row shows result, no Start.
- CoverageCard: view/style Segmented selecting calls onMapView/onMapStyle; renders bodymap + bars.
- VolumeInsightCard: shows rest/push names. StatTiles: shows the 3 values.
- TodayScreen: renders hero+rhythm+coverage+insight+stats; callbacks wired.
Cover every export + branch → 100%.

## Boundaries
Code agent: only `packages/B19-today/src/`. Tests RO. Import @nabd/domain,
@nabd/coverage (recommendation), @nabd/design-system, @nabd/bodymap, react.
NOTE: add @nabd/coverage to this package's deps if needed (it's already aliased in
vitest). No signature changes.
