# B20 · @nabd/planner — Plan screen (React, the largest UI block)

Interface frozen in `src/index.ts`. Pure builders + presentational components using
@nabd/design-system + @nabd/bodymap. Mutations are callbacks (the `cb` bag) wired to
the store in B23. Prototype refs (Nabd.dc.html): pSetBlock ~L1146-1168, pExPayload
~L1169-1176, pSlotPayload ~L1177-1185, pBoard ~L1186-1199, pEditor ~L1200-1215, and
the planner markup ~L208-462. Tests assert behavior/DOM/values, not pixels.

## Builders (pure — the testable core)
- `buildSetBlock(p)` where p is a prescription or cycled slot: for each set, compute a
  SetRowVM: warmup→badge "W"/kind"warm"; drop→"D"/"drop"; working→running number
  "1","2"…/"work". typeName = Warm-up/Working/Drop set. repsStr: time mode→`<a>s`; fixed→
  `<a>`; range→`<a>–<b>`. hasB = repMode==='range' && b!=null. showInt = intensity!=='none';
  intStr = rpe→`<val>`, pct→`<val>%`. Block-level: repHeader time→"TIME" else "REPS";
  intHeader rpe→"RPE"/pct→"%1RM"/else""; showIntCol; gridCols = showIntCol ?
  "30px minmax(150px,1fr) 86px 26px" : "30px minmax(150px,1fr) 26px"; restStr =
  `<floor(rest/60)>:<pad2(rest%60)>`; notes.
- `buildEditor(program, editDayId, library)`: pick the day (editDayId or first). exists
  false if none. isFixed = program.type==='fixed'. Build rows: FIXED → iterate exercises;
  consecutive ones sharing supersetId group into a {kind:'superset', members:[A1,A2…]}
  (supersetTag "A"+n), others {kind:'ex'}. Each ExerciseCardVM: name/muscles(joined
  primary+secondary names)/equip(EQUIPMENT_NAMES upper)/block=buildSetBlock. CYCLED →
  rows from day.slots → CycledSlotVM (group, muscle=group primary name, poolNames via
  library.byId, poolStr "<n> exercises", block). summary FIXED = "<n> exercises · <sets>
  sets · ~<min> min" (min=max(8,round(totalSets*3.4))); CYCLED = "<n> muscle groups".
  isWeekday = schedule==='weekday'; dayOrderLabel "Day <index+1>"; weekday.
- `buildBoard(program, profile, editDayId)`: delegate to @nabd/program-editor boardLayout
  then map to BoardColVM (kind day/rest/add, label, chips, more, editing = dayId===editDayId).

## Components (use design-system Segmented/Button/Stepper/MiniStepper/Card/Pill/Badge/Icon + bodymap)
- `SetTable` — `cb.onEdit(dayId, ref, op, ...args)` MUST match the store's planEdit
  convention exactly (wired directly in B23):
  - type badge button → `onEdit(dayId,ref,"cycleSetType", i)`
  - rep **a** steppers → `onEdit(dayId,ref,"stepRep", i, 1, +1|-1)`  (which **1 = a**)
  - rep **b** steppers (range, when hasB) → `onEdit(dayId,ref,"stepRep", i, 0, +1|-1)`  (which **0 = b**)
  - intensity stepper (when showInt) → `onEdit(dayId,ref,"stepVal", i, +1|-1)`
  - remove set → `onEdit(dayId,ref,"removeSet", i)`
  - rep-mode Segmented → `onEdit(dayId,ref,"setRepMode", idx)` (idx 0=range,1=fixed,2=time)
  - load/intensity Segmented → `onEdit(dayId,ref,"setIntensity", idx)` (0=none,1=rpe,2=pct)
  - rest steppers → `onEdit(dayId,ref,"setRest", +1|-1)`
  - + Add set → `onEdit(dayId,ref,"addSet")`; + Warmup → `onEdit(dayId,ref,"addWarmup")`
  - ⛓ Superset (fixed ex only) → `cb.onToggleSuperset(dayId, rowId)`
  - notes input → `cb.onNotes(dayId, ref, value)`
- `ProgramHeader`: program name; Fixed|Cycled Segmented → onSetType; Weekdays|Floating →
  onSetSchedule; profile button → onToggleProfileMenu; menu lists profiles → onSetProfile.
- `WeekBoard`: render columns; day card click → onSelectDay; rest "+ Add day" → onAddDay(wd);
  add column → onAddDay(null); editing card marked.
- `DayEditor`: name input → onRenameDay; weekday picker (weekday mode) → onSetWeekday;
  summary; Delete day → onRemoveDay; rows (ExerciseCard/SupersetGroup/CycledSlot each with
  SetTable); fixed: "+ Add exercise" → onAddExercise; cycled: group chips → onAddSlot, pool
  "+ Add exercise" → onAddPool, remove pool chip → onRemoveFromPool, remove slot → onRemoveSlot;
  remove exercise → onRemoveExercise.
- `PlannerScreen`: composes header + board + (editor | nothing) + coverage rail (BodyMap
  front/back from coverage + volumeBars MuscleBar-style rows). Build board/editor internally.

## Test Cases
- buildSetBlock: warmup/working/drop badges + numbering; range/fixed/time repsStr; rpe/pct
  intStr + headers + gridCols (with/without int col); restStr formatting; notes.
- buildEditor: fixed rows incl. a superset group (members tagged A1/A2); cycled slot rows
  with pool names; summary math both modes; no-day → exists false; weekday/floating fields.
- buildBoard: weekday columns (day/rest/add) + floating; editing flag; chips/more.
- SetTable: each control fires cb.onEdit with the right op+args / onNotes; badge cycles.
- ProgramHeader: Fixed/Cycled + Weekdays/Floating Segmented → callbacks; profile menu.
- WeekBoard: select day, add day(weekday/floating).
- DayEditor: rename, weekday pick, delete, add exercise/slot, remove, pool add/remove.
- PlannerScreen: renders header+board+editor+rail; callbacks wired.
Cover every export + branch → 100%.

## Boundaries
Code agent: only `packages/B20-planner/src/`. Tests RO. Import @nabd/domain,
@nabd/program-editor (boardLayout/daySummary), @nabd/coverage, @nabd/dataset,
@nabd/design-system, @nabd/bodymap, react. No signature changes.
