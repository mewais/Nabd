//! The tray menu model and its tooltip.

use nabd_native::{TrayItem, TrayState, TRAY_OPEN, TRAY_PAUSE, TRAY_START, TRAY_STATUS};

const APP: &str = "Nabd";

fn tray_state(next_exercise: Option<&str>, done: u32, total: u32) -> TrayState {
    TrayState {
        next_exercise: next_exercise.map(str::to_string),
        done,
        total,
        paused: false,
    }
}

fn paused(state: TrayState) -> TrayState {
    TrayState {
        paused: true,
        ..state
    }
}

/// The entry with the given id (panics if the menu has none).
fn item(state: &TrayState, id: &str) -> TrayItem {
    state
        .items(APP)
        .into_iter()
        .find(|item| item.id == id)
        .unwrap()
}

#[test]
fn the_status_line_says_where_the_day_stands_and_is_never_clickable() {
    for (state, line) in [
        (
            tray_state(Some("Push-up"), 2, 6),
            "Next: Push-up · 2/6 sets",
        ),
        (tray_state(None, 0, 0), "Nothing planned today"),
        (tray_state(None, 6, 6), "All done · 6/6 sets"),
    ] {
        let status = item(&state, TRAY_STATUS);
        assert_eq!((status.label.as_str(), status.enabled), (line, false));
    }
}

#[test]
fn start_is_enabled_only_when_there_is_a_next_exercise_paused_or_not() {
    assert!(item(&tray_state(Some("Squat"), 1, 4), TRAY_START).enabled);
    assert!(item(&paused(tray_state(Some("Squat"), 1, 4)), TRAY_START).enabled);
    assert!(!item(&tray_state(None, 0, 0), TRAY_START).enabled);
    assert!(!item(&tray_state(None, 4, 4), TRAY_START).enabled);
}

#[test]
fn the_pause_entry_offers_to_pause_while_running_and_to_resume_while_paused() {
    let running = tray_state(Some("Squat"), 1, 4);
    assert_eq!(item(&running, TRAY_PAUSE).label, "Pause nudges");
    assert_eq!(item(&paused(running), TRAY_PAUSE).label, "Resume nudges");
}

#[test]
fn the_open_entry_and_the_tooltip_name_the_app_it_is_given() {
    assert_eq!(item(&TrayState::default(), TRAY_OPEN).label, "Open Nabd");
    assert_eq!(
        tray_state(Some("Push-up"), 2, 6).tooltip("Other"),
        "Other — Next: Push-up · 2/6 sets"
    );
    assert_eq!(
        paused(tray_state(None, 6, 6)).tooltip(APP),
        "Nabd (paused) — All done · 6/6 sets"
    );
}
