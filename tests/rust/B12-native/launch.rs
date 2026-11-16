//! How a launch starts, and what closing the window does.

use nabd_native::{
    close_action, is_autostart_launch, starts_hidden, CloseAction, Launch, AUTOSTART_ARG,
};

fn launch(autostart: bool, start_minimized: bool, tray: bool) -> Launch {
    Launch {
        autostart,
        start_minimized,
        tray,
    }
}

// ── arguments ────────────────────────────────────────────────────────────────

#[test]
fn the_autostart_flag_marks_a_login_launch() {
    assert_eq!(AUTOSTART_ARG, "--autostart");
    assert!(is_autostart_launch(&["/usr/bin/nabd", "--autostart"]));
    assert!(is_autostart_launch(&[
        "nabd.exe".to_string(),
        "--autostart".to_string()
    ]));
}

#[test]
fn a_launch_without_the_flag_is_a_manual_one() {
    assert!(!is_autostart_launch(&["/usr/bin/nabd"]));
    assert!(!is_autostart_launch(&["/usr/bin/nabd", "--autostartx"]));
    assert!(!is_autostart_launch::<&str>(&[]));
}

// ── window visibility at launch ──────────────────────────────────────────────

#[test]
fn a_login_launch_starts_in_the_tray_whatever_the_setting() {
    assert!(starts_hidden(launch(true, false, true)));
    assert!(starts_hidden(launch(true, true, true)));
}

#[test]
fn a_manual_launch_follows_the_start_minimized_setting() {
    assert!(starts_hidden(launch(false, true, true)));
    assert!(!starts_hidden(launch(false, false, true)));
}

#[test]
fn without_a_tray_the_window_is_always_shown() {
    for autostart in [true, false] {
        for start_minimized in [true, false] {
            assert!(!starts_hidden(launch(autostart, start_minimized, false)));
        }
    }
}

// ── closing ──────────────────────────────────────────────────────────────────

#[test]
fn closing_hides_to_the_tray_when_there_is_one() {
    assert_eq!(close_action(true), CloseAction::HideToTray);
}

#[test]
fn closing_quits_when_there_is_no_tray_to_come_back_from() {
    assert_eq!(close_action(false), CloseAction::Quit);
}
