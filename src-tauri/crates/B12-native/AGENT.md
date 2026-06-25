# B12 · nabd-native — pure native-behavior logic (Rust)

Interface frozen in `src/lib.rs`. No OS/Tauri deps — pure decisions, 100% testable.
The real FFI (idle polling, tray, vibrancy, notifications, autostart) is wired in
the Tauri binary (B23) and validated by IT4 E2E.

## Behavior
- `idle_crossed(idle, threshold)` = `idle >= threshold`.
- `vibrancy_alpha(opacity)`: clamp `opacity` to [0.2, 0.9], then `round(opacity*255)`
  as u8 (e.g. 0.55→140, 0.2→51, 0.9→230; out-of-range clamps first).
- `tray_items(state)`: return, in order —
  1. status: id `"status"`, enabled=false, label = if `next_exercise` is Some →
     `"Next: <exercise> @ <next_time>"` (use next_time or "" if None); else
     `"All sets done (<done>/<total>)"`.
  2. id `"start"`, label `"Start next set"`, enabled = `next_exercise.is_some()`.
  3. id `"pause"`, label = `paused ? "Resume nudges" : "Pause nudges"`, enabled true.
  4. id `"open"`, label `"Open Nabd"`, enabled true.
  5. id `"quit"`, label `"Quit"`, enabled true.
- `notif_payload(reason, exercise)`: `title="Time to move"`, body =
  `"<exercise> — Interval's up"` for Timer, `"<exercise> — You've gone quiet"` for Idle.
- `autostart_action(desired, currently)`: desired&&!currently→Some(true);
  !desired&&currently→Some(false); else None.

## Test Cases (tests/rust/B12-native/main.rs — all GREEN-able? NO: skeleton panics)
Write real value-asserting tests (red against skeleton via unimplemented panic):
- idle_crossed: below, equal, above threshold.
- vibrancy_alpha: 0.55→140, 0.2→51, 0.9→230, below-range (0.0)→51, above-range (1.0)→230.
- tray_items: with a due set (status label, start enabled, pause label when not paused);
  with no due set (all done status, start disabled); paused→"Resume nudges". Assert
  ids/labels/enabled for each item and the count/order.
- notif_payload: Timer and Idle bodies + title.
- autostart_action: all four combinations.

## Coverage gate
`cargo llvm-cov --manifest-path src-tauri/Cargo.toml -p nabd-native --summary-only`
→ 100% regions/functions/lines for src/**.

## Boundaries
Code agent: only `src-tauri/crates/B12-native/src/`. Test agent: only
`tests/rust/B12-native/`. No signature changes. No #[should_panic] for behavior.
