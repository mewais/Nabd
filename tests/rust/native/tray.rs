//! The tray menu model, its tooltip and its commands.

use nabd_native::{
    TrayCommand, TrayItem, TrayState, TRAY_OPEN, TRAY_PAUSE, TRAY_QUIT, TRAY_START, TRAY_STATUS,
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

// ── menu items ───────────────────────────────────────────────────────────────

#[test]
fn tray_has_five_entries_in_a_fixed_order() {
    let ids: Vec<&str> = TrayState::default()
        .items()
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
    let items = tray_state(Some("Push-up"), 2, 6).items();
    assert_eq!(item(&items, TRAY_STATUS).label, "Next: Push-up · 2/6 sets");
}

#[test]
fn status_says_nothing_planned_when_the_day_is_empty() {
    let items = tray_state(None, 0, 0).items();
    assert_eq!(item(&items, TRAY_STATUS).label, "Nothing planned today");
}

#[test]
fn status_says_all_done_when_nothing_is_left() {
    let items = tray_state(None, 6, 6).items();
    assert_eq!(item(&items, TRAY_STATUS).label, "All done · 6/6 sets");
}

#[test]
fn status_line_is_never_clickable() {
    for state in [
        tray_state(Some("Squat"), 1, 4),
        tray_state(None, 0, 0),
        tray_state(None, 4, 4),
    ] {
        assert!(!item(&state.items(), TRAY_STATUS).enabled);
    }
}

#[test]
fn start_is_enabled_only_when_there_is_a_next_exercise() {
    let start = |state: &TrayState| item(&state.items(), TRAY_START);

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
    let items = tray_state(Some("Squat"), 1, 4).items();
    assert_eq!(item(&items, TRAY_PAUSE).label, "Pause nudges");
}

#[test]
fn pause_entry_offers_to_resume_while_paused() {
    let state = TrayState {
        paused: true,
        ..tray_state(Some("Squat"), 1, 4)
    };
    assert_eq!(item(&state.items(), TRAY_PAUSE).label, "Resume nudges");
}

#[test]
fn pausing_does_not_disable_start() {
    let state = TrayState {
        paused: true,
        ..tray_state(Some("Squat"), 1, 4)
    };
    assert!(item(&state.items(), TRAY_START).enabled);
}

#[test]
fn pause_open_and_quit_are_always_enabled() {
    for state in [
        tray_state(Some("Squat"), 1, 4),
        tray_state(None, 0, 0),
        tray_state(None, 4, 4),
    ] {
        let items = state.items();
        assert!(item(&items, TRAY_PAUSE).enabled);
        assert!(item(&items, TRAY_OPEN).enabled);
        assert!(item(&items, TRAY_QUIT).enabled);
    }
}

#[test]
fn open_and_quit_have_fixed_labels() {
    let items = TrayState::default().items();
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

// ── tooltip ──────────────────────────────────────────────────────────────────

#[test]
fn tooltip_names_the_app_and_where_the_day_stands() {
    assert_eq!(
        tray_state(Some("Push-up"), 2, 6).tooltip(),
        "Nabd — Next: Push-up · 2/6 sets"
    );
    assert_eq!(
        tray_state(None, 0, 0).tooltip(),
        "Nabd — Nothing planned today"
    );
}

#[test]
fn tooltip_says_when_nudges_are_paused() {
    let state = TrayState {
        paused: true,
        ..tray_state(None, 6, 6)
    };
    assert_eq!(state.tooltip(), "Nabd (paused) — All done · 6/6 sets");
}

// ── commands ─────────────────────────────────────────────────────────────────

#[test]
fn every_clickable_entry_maps_to_a_command() {
    assert_eq!(TrayCommand::from_id(TRAY_START), Some(TrayCommand::Start));
    assert_eq!(TrayCommand::from_id(TRAY_PAUSE), Some(TrayCommand::Pause));
    assert_eq!(TrayCommand::from_id(TRAY_OPEN), Some(TrayCommand::Open));
    assert_eq!(TrayCommand::from_id(TRAY_QUIT), Some(TrayCommand::Quit));
}

#[test]
fn the_status_line_and_unknown_ids_are_not_commands() {
    assert_eq!(TrayCommand::from_id(TRAY_STATUS), None);
    assert_eq!(TrayCommand::from_id("something-else"), None);
}

#[test]
fn only_start_and_open_bring_the_window_forward() {
    assert!(TrayCommand::Start.reveals_window());
    assert!(TrayCommand::Open.reveals_window());
    // Pausing from the tray is meant to be done without the app coming up.
    assert!(!TrayCommand::Pause.reveals_window());
    assert!(!TrayCommand::Quit.reveals_window());
}

#[test]
fn start_and_pause_are_forwarded_to_the_frontend_under_their_ids() {
    assert_eq!(TrayCommand::Start.frontend_action(), Some("start"));
    assert_eq!(TrayCommand::Pause.frontend_action(), Some("pause"));
    assert_eq!(TrayCommand::Open.frontend_action(), None);
    assert_eq!(TrayCommand::Quit.frontend_action(), None);
}
