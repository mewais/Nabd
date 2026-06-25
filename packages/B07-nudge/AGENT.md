# B07 · @nabd/nudge — idle + timer nudge engine (pure)

Interface frozen in `src/index.ts`. Prototype refs: `tick` (~L992-1001),
`dueNotif` (~L1003-1007), `snooze` (~L1306), reset on save (~L1375).

## Behavior
- `tick({state, currentSlot})`: new state with `secondsToNext = max(0, s-1)`,
  `idleSeconds = idle+1`. Then if `!busy && !notif && currentSlot`: if the new
  `secondsToNext === 0` → `notif = dueNotif("timer", currentSlot)`; else if new
  `idleSeconds >= idleNudge` → `notif = dueNotif("idle", currentSlot)`. Timer wins
  when both fire same tick. No slot, busy, or existing notif → no new notif.
- `dueNotif(reason, slot)`: `{slot, reason, label: reason==="idle" ? "You've gone
  quiet" : "Interval's up"}`.
- `resetIdle(state)`: `idleSeconds=0` (return same ref only if already 0 is fine,
  but prefer new object).
- `snooze(state, snoozeSec)`: `{notif:null, secondsToNext:snoozeSec, idleSeconds:0}`.
- `resetTimer(state, intervalMin)`: `secondsToNext = intervalMin*60`, `idleSeconds=0`,
  `notif=null`.

## Test Cases
- tick decrements timer + increments idle each call.
- timer hits 0 → timer notif raised (with slot + "Interval's up").
- idle reaches threshold → idle notif ("You've gone quiet").
- both conditions same tick → timer wins.
- busy true → no notif; existing notif → unchanged; null slot → no notif.
- secondsToNext floored at 0 (doesn't go negative).
- resetIdle zeroes idle; snooze sets timer+clears; resetTimer sets interval*60.

## Boundaries
Code agent edits only `packages/B07-nudge/`. Tests RO.
