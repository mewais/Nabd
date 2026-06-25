# B22 · @nabd/modals — overlays (React)

Interface frozen in `src/index.ts`. Presentational, props-driven, using
@nabd/design-system primitives. Prototype refs (Nabd.dc.html): session modal
~L645-705 (the NEW two-pane model — left list with "0/6 sets" + green check, right
"Set X of Y" + Reps/Weight steppers + "Log this set", footer "N sets logged"),
notification toast ~L628-643, library modal ~L687-771, settings ~L820-900,
full-history chart ~L773-819. Tests assert behavior/DOM/values, not pixels.

## Behavior (key points)
- `ModalShell`: fixed backdrop; clicking backdrop → onClose; clicking the panel does
  NOT close (stopPropagation).
- `buildSessionList(slots, activeSlotId)`: one row per slot → `{slotId, exercise,
  muscles (joined names), done, sets, complete: done>=sets, active: slotId===activeSlotId}`.
- `SessionModal`: left pane lists rows (each shows "<exercise> · <done>/<sets> sets";
  complete rows get a check; active row highlighted; clicking a row → onPick(slotId)).
  Right pane: setOfLabel ("Set X of Y"), the active exercise + muscles, the suggestion,
  a Reps (or Sec) stepper (onStepReps ±1) and, when session.weighted, a Weight stepper
  (onStepWeight ±1); "Log this set" → onLog; footer shows
  session.logged.length ("N sets logged this session" / "No sets logged yet"); Done →
  onClose. No "number of sets" stepper.
- `NotificationToast`: "TIME TO MOVE", reasonLabel, exercise, sub; "Let's go"→onConfirm,
  "Snooze"→onSnooze.
- `LibraryModal`: when `open` false → render nothing. Browsing: search input→onSearch,
  group chips→onGroup (active marked), item rows (name+CUSTOM badge if custom, muscles,
  trackLabel, equip, a "+"→onPick(id), a duplicate btn→onCopy(id)), emptyMsg when no
  items, "Create…"→onStartCreate. Creating: name input→onDraft('name',v), group select→
  onDraft('group',v), secondary chips→onToggleSecondary, track select→onDraft('track',v),
  equip select→onDraft('equip',v), Create→onCreate, Back→onCancelCreate. Title = title prop.
- `SettingsModal`: appearance theme Segmented→onTheme; when translucent, opacity stepper
  (onOpacity ±) + 4 wallpaper swatches (onWallpaper); startup toggles (onToggleStartup/
  onToggleMinimized) reflecting settings; notification steppers interval (onInterval) +
  idleNudge (onIdleNudge) showing settings values; Export→onExport, Import→onImport; close→onClose.
- `buildChartVM(exercise, series, unit, startLabel)`: compute pr (max), current (last),
  gainAll (last-first), points (polyline via the same geometry as B05 trendPoints over
  W=680,H=240,pad=30), areaPoints (pad,(H-pad) + points + (W-pad),(H-pad)), viewBox
  "0 0 680 240", gridY = [max,(max+min)/2,min] mapped to y + label; sessions=series.length.
  Format pr/current/gainAll with unit (gain sign-prefixed).
- `FullHistoryChartModal`: renders exercise, since/sessions, PB/current/gain stat tiles,
  the area+line svg with gridlines, start→now axis; close→onClose.

## Test Cases
- ModalShell: backdrop click→onClose; panel click does NOT call onClose.
- buildSessionList: rows with complete/active flags; muscles joined.
- SessionModal: renders setOfLabel + exercise + suggestion; Reps stepper ± → onStepReps(±1);
  weighted shows Weight stepper → onStepWeight(±1); non-weighted hides it; Log→onLog;
  picking a left row→onPick(id); footer reflects logged.length (0 → "No sets logged yet");
  Done→onClose; complete row shows a check/marker.
- NotificationToast: text; Let's go→onConfirm; Snooze→onSnooze.
- LibraryModal: open=false renders null; browsing list + search→onSearch + group→onGroup +
  pick→onPick + copy→onCopy + startCreate→onStartCreate + CUSTOM badge on custom items +
  emptyMsg; creating form: each field→onDraft/onToggleSecondary, Create→onCreate, Back→onCancelCreate.
- SettingsModal: theme Segmented→onTheme; translucent shows opacity+wallpapers (and
  light/dark hide them); opacity ±→onOpacity; wallpaper→onWallpaper; toggles→callbacks;
  interval/idle steppers→callbacks + show values; export/import→callbacks; close→onClose.
- buildChartVM: pr/current/gainAll values; points count; viewBox; gridY length 3.
- FullHistoryChartModal: renders exercise + stats + svg; close→onClose.
Cover every export + branch → 100%.

## Boundaries
Code agent: only `packages/B22-modals/src/`. Tests RO. Import @nabd/domain,
@nabd/design-system, @nabd/progression (trendPoints geometry if reused), react.
No signature changes.
