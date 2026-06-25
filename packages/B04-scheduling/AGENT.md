# B04 · @nabd/scheduling — scheduling engine (pure)

Interface frozen in `src/index.ts`. Prototype refs: `buildSlots` (~L1054-1083),
`currentSlot` (~L1008), `applyStatuses`/`saveActive` advance (~L1352-1355).
NOTE: the prototype is a demo; implement the REAL semantics below (per decisions).

## Behavior
- `resolveTodayDay(program, date, ctx)`: **weekday** schedule → the day with
  `weekday === date.getDay()` (0=Sun), or null. **floating** → if no days, null;
  else `days[ctx.floatingIndex % days.length]`.
- `rotationFor(slotId, pool, rotation)`: empty pool→null; else
  `pool[(rotation[slotId] ?? 0) % pool.length]`.
- `buildSlots(day, lookup, rotation, intervalMin)`: produce one Slot per exercise
  occurrence (fixed: each `day.exercises` in order; cycled: each `day.slots`,
  resolving `rotationFor`). For each: `min = DEFAULTS.startMin + i*intervalMin`,
  `timeStr = "HH:MM"`, `exercise`=name via lookup, `group`, `muscles`=lookup
  primary∪secondary, `sets`=count of non-warmup sets in the prescription (min 1),
  `done`=0, `status`="upcoming", `result`=""; `id` stable per index. Skip
  exercises whose lookup misses.
- `applyStatuses(slots, doneCount)`: first `doneCount` slots → "done"; the next →
  "now"; rest "upcoming". (doneCount≥length → all done.)
- `startOutOfOrder(slots, slotId)`: set the target slot to "now" (leave others'
  done/skipped; demote any other "now" to "upcoming").
- `currentSlot(slots)`: first "now", else first "upcoming", else null.
- `advanceRotation(day, rotation)`: for each cycled slot in the day, increment its
  pointer by 1 (new object).
- `rollover(program, prev, ctx, nextDate)`: unfinished slots (status not "done")→
  collect as "skipped"; `advanceRotation` for the prev day's groups; if every slot
  was "done", `floatingIndex+1` else unchanged; return `{rotationState,
  floatingIndex, skipped}`.

## Test Cases
- resolveTodayDay weekday: match, no-match→null; floating: index wrap; empty→null.
- rotationFor: empty→null; wrap with pointer> len; default pointer 0.
- buildSlots fixed: times at 09:30, +interval; sets = non-warmup count; muscles
  from lookup; missing lookup skipped.
- buildSlots cycled: resolves rotated exercise per slot; drift when two slots have
  pools of size 3 and 2 across successive rotation states.
- applyStatuses: doneCount 0/partial/all; the now pointer placement.
- startOutOfOrder: target→now, previous now→upcoming, done untouched.
- currentSlot: now precedence, else upcoming, else null.
- advanceRotation: increments each cycled slot pointer.
- rollover: skipped collection; floatingIndex advances only on full completion;
  rotation advanced.

## Boundaries
Code agent edits only `packages/B04-scheduling/`. Tests RO.
