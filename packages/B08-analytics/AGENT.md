# B08 · @nabd/analytics — Progress analytics (pure)

Interface frozen in `src/index.ts`. Prototype refs: `buildProgress` (~L1343-1430)
for time-of-day, trigger mix, calendar levels, weekly bars, completion. The
prototype hard-codes demo numbers; here compute everything from `history`.

## Behavior (all take real LoggedSet[] history)
- `streak(history, now)`: count consecutive calendar days with ≥1 logged set,
  ending today (or yesterday if today empty). 0 if none.
- `setsThisWeek(history, now)`: count logged sets with date in the current ISO-ish
  week (Mon–Sun) containing `now`.
- `completionThisWeek(history, plannedPerWeek, now)`: `round(min(100,
  setsThisWeek/plannedPerWeek*100))`; plannedPerWeek 0 → 0.
- `activeDays30(history, now)`: distinct dates with ≥1 set in the last 30 days.
- `timeOfDay(history)`: 24-bucket counts by `new Date(ts).getHours()`; `peak` =
  hour with max count (lowest hour on tie); empty → all 0, peak 0.
- `triggerMix(history)`: percentage split over idle/timer/manual (rounded, summing
  to ~100; empty → all 0).
- `calendarHeatmap(history, now)`: for each day of `now`'s month, `level`: future
  day → -1; else by set count that day → 0 (none),1 (1–2),2 (3–5),3 (>5).
- `weeklyBars(history, now)`: total sets per week for the last 8 weeks (oldest
  first, current week last).
- `completionLast7(history, plannedPerDay, now)`: for each of the last 7 days
  (oldest first) → `round(min(100, daySets/plannedPerDay*100))`.

## Test Cases
Build synthetic histories with fixed `now` (pass dates explicitly — no Date.now):
- streak: 3 consecutive incl. today; gap breaks; empty→0; counts from yesterday.
- setsThisWeek / activeDays30: boundary at week/30-day edge.
- completionThisWeek: ratios, clamp 100, plannedPerWeek 0.
- timeOfDay: bucketing, peak, tie→lowest hour, empty.
- triggerMix: split for mixed triggers; empty all 0.
- calendarHeatmap: level buckets 0/1/2/3 + future -1 for current month.
- weeklyBars: 8 entries, correct per-week sums, current last.
- completionLast7: 7 entries oldest-first, clamp.

## Boundaries
Code agent edits only `packages/B08-analytics/`. Tests RO. Pure; never read the
system clock — use the `now` parameter.
