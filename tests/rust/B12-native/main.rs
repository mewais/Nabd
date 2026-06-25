use nabd_native::{
    autostart_action, idle_crossed, notif_payload, tray_items, NotifReason, TrayState,
};

// ──────────────────────────────────────────────────────────────
// idle_crossed
// ──────────────────────────────────────────────────────────────

#[test]
fn idle_crossed_below_threshold() {
    // 29 seconds idle, threshold 30 → not yet crossed
    assert_eq!(idle_crossed(29, 30), false);
}

#[test]
fn idle_crossed_equal_threshold() {
    // exactly at threshold → crossed (>=)
    assert_eq!(idle_crossed(30, 30), true);
}

#[test]
fn idle_crossed_above_threshold() {
    // well past threshold
    assert_eq!(idle_crossed(120, 30), true);
}

// ──────────────────────────────────────────────────────────────
// vibrancy_alpha
// ──────────────────────────────────────────────────────────────

#[test]
fn vibrancy_alpha_mid_range() {
    // 0.55 × 255 = 140.25 → round → 140
    use nabd_native::vibrancy_alpha;
    assert_eq!(vibrancy_alpha(0.55), 140);
}

#[test]
fn vibrancy_alpha_lower_bound() {
    // 0.2 × 255 = 51.0 → 51
    use nabd_native::vibrancy_alpha;
    assert_eq!(vibrancy_alpha(0.2), 51);
}

#[test]
fn vibrancy_alpha_upper_bound() {
    // 0.9 × 255 = 229.5 → round → 230
    use nabd_native::vibrancy_alpha;
    assert_eq!(vibrancy_alpha(0.9), 230);
}

#[test]
fn vibrancy_alpha_below_range_clamps_to_lower() {
    // 0.0 is below 0.2 → clamp to 0.2 → 51
    use nabd_native::vibrancy_alpha;
    assert_eq!(vibrancy_alpha(0.0), 51);
}

#[test]
fn vibrancy_alpha_above_range_clamps_to_upper() {
    // 1.0 is above 0.9 → clamp to 0.9 → 230
    use nabd_native::vibrancy_alpha;
    assert_eq!(vibrancy_alpha(1.0), 230);
}

// ──────────────────────────────────────────────────────────────
// tray_items — helpers
// ──────────────────────────────────────────────────────────────

fn state_with_due_set() -> TrayState {
    TrayState {
        next_exercise: Some("Squats".to_string()),
        next_time: Some("14:30".to_string()),
        done: 2,
        total: 5,
        paused: false,
    }
}

fn state_all_done() -> TrayState {
    TrayState {
        next_exercise: None,
        next_time: None,
        done: 5,
        total: 5,
        paused: false,
    }
}

fn state_paused() -> TrayState {
    TrayState {
        next_exercise: Some("Push-ups".to_string()),
        next_time: Some("15:00".to_string()),
        done: 1,
        total: 3,
        paused: true,
    }
}

// ──────────────────────────────────────────────────────────────
// tray_items — item count and ordering
// ──────────────────────────────────────────────────────────────

#[test]
fn tray_items_count_is_five() {
    let items = tray_items(&state_with_due_set());
    assert_eq!(items.len(), 5);
}

#[test]
fn tray_items_ids_in_order() {
    let items = tray_items(&state_with_due_set());
    let ids: Vec<&str> = items.iter().map(|i| i.id.as_str()).collect();
    assert_eq!(ids, ["status", "start", "pause", "open", "quit"]);
}

// ──────────────────────────────────────────────────────────────
// tray_items — with a due set (not paused)
// ──────────────────────────────────────────────────────────────

#[test]
fn tray_items_status_label_with_due_set() {
    let items = tray_items(&state_with_due_set());
    assert_eq!(items[0].id, "status");
    assert_eq!(items[0].label, "Next: Squats @ 14:30");
    assert_eq!(items[0].enabled, false);
}

#[test]
fn tray_items_start_enabled_when_due_set() {
    let items = tray_items(&state_with_due_set());
    assert_eq!(items[1].id, "start");
    assert_eq!(items[1].label, "Start next set");
    assert_eq!(items[1].enabled, true);
}

#[test]
fn tray_items_pause_label_when_not_paused() {
    let items = tray_items(&state_with_due_set());
    assert_eq!(items[2].id, "pause");
    assert_eq!(items[2].label, "Pause nudges");
    assert_eq!(items[2].enabled, true);
}

#[test]
fn tray_items_open_item() {
    let items = tray_items(&state_with_due_set());
    assert_eq!(items[3].id, "open");
    assert_eq!(items[3].label, "Open Nabd");
    assert_eq!(items[3].enabled, true);
}

#[test]
fn tray_items_quit_item() {
    let items = tray_items(&state_with_due_set());
    assert_eq!(items[4].id, "quit");
    assert_eq!(items[4].label, "Quit");
    assert_eq!(items[4].enabled, true);
}

// ──────────────────────────────────────────────────────────────
// tray_items — all sets done (next_exercise is None)
// ──────────────────────────────────────────────────────────────

#[test]
fn tray_items_status_label_all_done() {
    let items = tray_items(&state_all_done());
    assert_eq!(items[0].id, "status");
    assert_eq!(items[0].label, "All sets done (5/5)");
    assert_eq!(items[0].enabled, false);
}

#[test]
fn tray_items_start_disabled_when_all_done() {
    let items = tray_items(&state_all_done());
    assert_eq!(items[1].id, "start");
    assert_eq!(items[1].label, "Start next set");
    assert_eq!(items[1].enabled, false);
}

// ──────────────────────────────────────────────────────────────
// tray_items — paused state → "Resume nudges"
// ──────────────────────────────────────────────────────────────

#[test]
fn tray_items_pause_label_when_paused() {
    let items = tray_items(&state_paused());
    assert_eq!(items[2].id, "pause");
    assert_eq!(items[2].label, "Resume nudges");
    assert_eq!(items[2].enabled, true);
}

// ──────────────────────────────────────────────────────────────
// tray_items — next_time is None (falls back to empty string in label)
// ──────────────────────────────────────────────────────────────

#[test]
fn tray_items_status_label_no_next_time() {
    let state = TrayState {
        next_exercise: Some("Lunges".to_string()),
        next_time: None,
        done: 0,
        total: 4,
        paused: false,
    };
    let items = tray_items(&state);
    assert_eq!(items[0].label, "Next: Lunges @ ");
}

// ──────────────────────────────────────────────────────────────
// notif_payload
// ──────────────────────────────────────────────────────────────

#[test]
fn notif_payload_timer_title() {
    let p = notif_payload(NotifReason::Timer, "Pull-ups");
    assert_eq!(p.title, "Time to move");
}

#[test]
fn notif_payload_timer_body() {
    let p = notif_payload(NotifReason::Timer, "Pull-ups");
    assert_eq!(p.body, "Pull-ups — Interval's up");
}

#[test]
fn notif_payload_idle_title() {
    let p = notif_payload(NotifReason::Idle, "Planks");
    assert_eq!(p.title, "Time to move");
}

#[test]
fn notif_payload_idle_body() {
    let p = notif_payload(NotifReason::Idle, "Planks");
    assert_eq!(p.body, "Planks — You've gone quiet");
}

// ──────────────────────────────────────────────────────────────
// autostart_action
// ──────────────────────────────────────────────────────────────

#[test]
fn autostart_action_desired_not_registered() {
    // want it ON, currently OFF → register
    assert_eq!(autostart_action(true, false), Some(true));
}

#[test]
fn autostart_action_not_desired_registered() {
    // want it OFF, currently ON → unregister
    assert_eq!(autostart_action(false, true), Some(false));
}

#[test]
fn autostart_action_desired_already_registered() {
    // want it ON, already ON → nothing to do
    assert_eq!(autostart_action(true, true), None);
}

#[test]
fn autostart_action_not_desired_not_registered() {
    // want it OFF, already OFF → nothing to do
    assert_eq!(autostart_action(false, false), None);
}
