//! B12 · nabd-native — tray model, notification text and vibrancy alpha.

use nabd_native::{
    notif_payload, tray_items, vibrancy_alpha, NotifReason, TrayItem, TrayState, TRAY_OPEN,
    TRAY_PAUSE, TRAY_QUIT, TRAY_START, TRAY_STATUS,
};

// ── fixtures ─────────────────────────────────────────────────────────────────

fn tray_state(next_exercise: Option<&str>, done: u32, total: u32) -> TrayState {
    TrayState {
        next_exercise: next_exercise.map(str::to_string),
        done,
        total,
        paused: false,
    }
}

/// The entry with the given id (panics if the menu has none).
fn item(items: &[TrayItem], id: &str) -> TrayItem {
    items.iter().find(|item| item.id == id).cloned().unwrap()
}

// ── vibrancy_alpha ───────────────────────────────────────────────────────────

#[test]
fn alpha_is_fully_opaque_at_one() {
    assert_eq!(vibrancy_alpha(1.0), 255);
}

#[test]
fn alpha_scales_and_rounds_to_nearest() {
    assert_eq!(vibrancy_alpha(0.5), 128); // 127.5 rounds up
    assert_eq!(vibrancy_alpha(0.8), 204);
    assert_eq!(vibrancy_alpha(0.25), 64); // 63.75
    assert_eq!(vibrancy_alpha(0.26), 66); // 66.3
}

#[test]
fn alpha_is_clamped_to_the_minimum_opacity() {
    let floor = vibrancy_alpha(0.1);
    assert_eq!(floor, 26); // 25.5 rounds up
    assert_eq!(vibrancy_alpha(0.0), floor);
    assert_eq!(vibrancy_alpha(0.05), floor);
    assert_eq!(vibrancy_alpha(-3.0), floor);
}

#[test]
fn alpha_is_clamped_to_fully_opaque_above_one() {
    assert_eq!(vibrancy_alpha(1.01), 255);
    assert_eq!(vibrancy_alpha(40.0), 255);
}

// ── tray_items ───────────────────────────────────────────────────────────────

#[test]
fn tray_has_five_entries_in_a_fixed_order() {
    let ids: Vec<&str> = tray_items(&TrayState::default())
        .iter()
        .map(|item| item.id)
        .collect();
    assert_eq!(
        ids,
        [TRAY_STATUS, TRAY_START, TRAY_PAUSE, TRAY_OPEN, TRAY_QUIT]
    );
    assert_eq!(ids, ["status", "start", "pause", "open", "quit"]);
}

#[test]
fn status_shows_the_next_exercise_and_progress() {
    let items = tray_items(&tray_state(Some("Push-up"), 2, 6));
    assert_eq!(item(&items, TRAY_STATUS).label, "Next: Push-up · 2/6 sets");
}

#[test]
fn status_says_nothing_planned_when_the_day_is_empty() {
    let items = tray_items(&tray_state(None, 0, 0));
    assert_eq!(item(&items, TRAY_STATUS).label, "Nothing planned today");
}

#[test]
fn status_says_all_done_when_nothing_is_left() {
    let items = tray_items(&tray_state(None, 6, 6));
    assert_eq!(item(&items, TRAY_STATUS).label, "All done · 6/6 sets");
}

#[test]
fn status_line_is_never_clickable() {
    for state in [
        tray_state(Some("Squat"), 1, 4),
        tray_state(None, 0, 0),
        tray_state(None, 4, 4),
    ] {
        assert!(!item(&tray_items(&state), TRAY_STATUS).enabled);
    }
}

#[test]
fn start_is_enabled_only_when_there_is_a_next_exercise() {
    let start = |state: &TrayState| item(&tray_items(state), TRAY_START);

    assert!(start(&tray_state(Some("Squat"), 1, 4)).enabled);
    assert!(!start(&tray_state(None, 0, 0)).enabled);
    assert!(!start(&tray_state(None, 4, 4)).enabled);
    assert_eq!(
        start(&tray_state(Some("Squat"), 1, 4)).label,
        "Start next set"
    );
}

#[test]
fn pause_entry_offers_to_pause_while_running() {
    let items = tray_items(&tray_state(Some("Squat"), 1, 4));
    assert_eq!(item(&items, TRAY_PAUSE).label, "Pause nudges");
}

#[test]
fn pause_entry_offers_to_resume_while_paused() {
    let state = TrayState {
        paused: true,
        ..tray_state(Some("Squat"), 1, 4)
    };
    assert_eq!(item(&tray_items(&state), TRAY_PAUSE).label, "Resume nudges");
}

#[test]
fn pausing_does_not_disable_start() {
    let state = TrayState {
        paused: true,
        ..tray_state(Some("Squat"), 1, 4)
    };
    assert!(item(&tray_items(&state), TRAY_START).enabled);
}

#[test]
fn pause_open_and_quit_are_always_enabled() {
    for state in [
        tray_state(Some("Squat"), 1, 4),
        tray_state(None, 0, 0),
        tray_state(None, 4, 4),
    ] {
        let items = tray_items(&state);
        assert!(item(&items, TRAY_PAUSE).enabled);
        assert!(item(&items, TRAY_OPEN).enabled);
        assert!(item(&items, TRAY_QUIT).enabled);
    }
}

#[test]
fn open_and_quit_have_fixed_labels() {
    let items = tray_items(&TrayState::default());
    assert_eq!(item(&items, TRAY_OPEN).label, "Open Nabd");
    assert_eq!(item(&items, TRAY_QUIT).label, "Quit");
}

// ── TrayState JSON ───────────────────────────────────────────────────────────

#[test]
fn tray_state_deserialises_from_camel_case_json() {
    let state: TrayState =
        serde_json::from_str(r#"{"nextExercise":"Plank","done":3,"total":5,"paused":true}"#)
            .unwrap();
    assert_eq!(
        state,
        TrayState {
            next_exercise: Some("Plank".to_string()),
            done: 3,
            total: 5,
            paused: true
        }
    );
}

#[test]
fn tray_state_accepts_a_null_next_exercise() {
    let state: TrayState =
        serde_json::from_str(r#"{"nextExercise":null,"done":5,"total":5,"paused":false}"#).unwrap();
    assert_eq!(state, tray_state(None, 5, 5));
}

#[test]
fn tray_state_rejects_missing_or_negative_counts() {
    assert!(serde_json::from_str::<TrayState>(
        r#"{"nextExercise":"Plank","total":2,"paused":false}"#
    )
    .is_err());
    assert!(serde_json::from_str::<TrayState>(
        r#"{"nextExercise":"Plank","done":-1,"total":2,"paused":false}"#
    )
    .is_err());
}

// ── notifications ────────────────────────────────────────────────────────────

#[test]
fn timer_notification_says_the_interval_is_up() {
    let payload = notif_payload(NotifReason::Timer, "Push-up");
    assert_eq!(payload.title, "Time to move");
    assert_eq!(payload.body, "Push-up — Interval's up");
}

#[test]
fn idle_notification_says_you_have_gone_quiet() {
    let payload = notif_payload(NotifReason::Idle, "Wall sit");
    assert_eq!(payload.title, "Time to move");
    assert_eq!(payload.body, "Wall sit — You've gone quiet");
}

#[test]
fn notif_payload_serialises_title_and_body() {
    let payload = notif_payload(NotifReason::Timer, "Squat");
    assert_eq!(
        serde_json::to_value(&payload).unwrap(),
        serde_json::json!({"title": "Time to move", "body": "Squat — Interval's up"})
    );
}

#[test]
fn notif_reason_deserialises_from_lowercase_strings() {
    assert_eq!(
        serde_json::from_str::<NotifReason>(r#""timer""#).unwrap(),
        NotifReason::Timer
    );
    assert_eq!(
        serde_json::from_str::<NotifReason>(r#""idle""#).unwrap(),
        NotifReason::Idle
    );
}

#[test]
fn notif_reason_rejects_unknown_or_capitalised_values() {
    assert!(serde_json::from_str::<NotifReason>(r#""Timer""#).is_err());
    assert!(serde_json::from_str::<NotifReason>(r#""manual""#).is_err());
}
