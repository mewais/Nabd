# B21 · @nabd/progress — Progress screen (React)

Interface frozen in `src/index.ts`. Pure builders over @nabd/analytics (B08) +
@nabd/progression (B05); components use @nabd/design-system + @nabd/bodymap.
Prototype refs: buildProgress ~L1343-1430, Progress markup ~L466-622. Tests assert
behavior/DOM/values, not pixels. Pass a fixed `now` everywhere (no Date.now).

## Builders (delegate to B08/B05 — don't reimplement)
- `buildKpis(history, plannedPerWeek, now)`: 4 KPIs — Current streak (analytics.streak,
  "days"), Completion this wk (analytics.completionThisWeek, "%"), Sets this week
  (analytics.setsThisWeek, "sets"), Active days 30d (analytics.activeDays30, "days").
- `buildCalendar(history, now)`: {month: "<Month> <year>", cells: analytics.calendarHeatmap}.
- `buildWeekly(history, now)`: analytics.weeklyBars → BarVM[] (label "now" for last else
  the week offset like "-7".."0"? use index; current flag on last; heightPct relative to max).
- `buildCompletion(history, plannedPerDay, now)`: {weekPct: "<completionThisWeek>%",
  days: analytics.completionLast7 → BarVM[] with M/T/W… labels, current flag on last}.
- `buildTimeOfDay(history)`: analytics.timeOfDay → bars per hour (label like "9a"/"12p"),
  peakLabel from peak hour; heightPct relative to max.
- `buildTriggerMix(history)`: analytics.triggerMix → segments [{label:"Idle detected",
  pct, color:"var(--accent)"},{label:"Timer",pct,color:"var(--accent2)"},{label:"Manual",
  pct,color:"var(--accent3)"}].
- `buildProgression(history, exNames)`: for each exId with history → best-set series via
  progression.fullHistorySeries; ProgressionRowVM {index, exercise: exNames[exId]||exId,
  points: progression.trendPoints(recent,120,34,5), pr: personalBest+unit?, gainStr:
  formatGain(gain,unit), up: gain>=0}. (unit reps vs kg — derive from whether weights exist;
  keep simple: if any logged weight present → "kg" else "reps".)

## Components (design-system + bodymap)
- KpiStrip: 4 tiles. ConsistencyCard: Calendar|Weekly Segmented → onTab; calendar grid
  (cells colored by level, future blank) OR weekly bars. CompletionCard: big weekPct +
  last-7 bars. TimeOfDayCard: hourly bars + "Peak <peakLabel>". TriggerCard: split bar +
  legend with pct. MuscleHeatmapCard: BodyMap front/back + MuscleBars from coverage.
  ProgressionCard: header + one clickable row per ProgressionRowVM (sparkline svg polyline,
  PR with trophy, gain badge) → onOpenChart(index). ProgressScreen: composes all + builds VMs.

## Test Cases
- Each builder: assert structure/values from a synthetic history + fixed now (streak/sets/
  completion numbers; calendar month string + cells length; weekly 8 bars current-last;
  completion 7 days; timeOfDay bars + peakLabel; trigger 3 segments + colors; progression
  rows with points/pr/gainStr/up, exercise name mapping).
- Components: render; ConsistencyCard tab Segmented → onTab; ProgressionCard row click →
  onOpenChart(i); others render their values.
Cover every export + branch → 100%.

## Boundaries
Code agent: only `packages/B21-progress/src/`. Tests RO. Import @nabd/domain,
@nabd/analytics, @nabd/progression, @nabd/coverage, @nabd/design-system, @nabd/bodymap,
react. No signature changes.
