//! How a launch starts, and what closing the window does.

use nabd_native::{CloseAction, Launch, AUTOSTART_ARG};

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
    assert!(Launch::is_autostart(&["/usr/bin/nabd", "--autostart"]));
    assert!(Launch::is_autostart(&[
        "nabd.exe".to_string(),
        "--autostart".to_string()
    ]));
}

#[test]
fn a_launch_without_the_flag_is_a_manual_one() {
    assert!(!Launch::is_autostart(&["/usr/bin/nabd"]));
    assert!(!Launch::is_autostart(&["/usr/bin/nabd", "--autostartx"]));
    assert!(!Launch::is_autostart::<&str>(&[]));
}

// ── window visibility at launch ──────────────────────────────────────────────

#[test]
fn a_login_launch_starts_in_the_tray_whatever_the_setting() {
    assert!(launch(true, false, true).starts_hidden());
    assert!(launch(true, true, true).starts_hidden());
}

#[test]
fn a_manual_launch_follows_the_start_minimized_setting() {
    assert!(launch(false, true, true).starts_hidden());
    assert!(!launch(false, false, true).starts_hidden());
}

#[test]
fn without_a_tray_the_window_is_always_shown() {
    for autostart in [true, false] {
        for start_minimized in [true, false] {
            assert!(!launch(autostart, start_minimized, false).starts_hidden());
        }
    }
}

// ── closing ──────────────────────────────────────────────────────────────────

#[test]
fn closing_hides_to_the_tray_when_there_is_one() {
    assert_eq!(CloseAction::for_tray(true), CloseAction::HideToTray);
}

#[test]
fn closing_quits_when_there_is_no_tray_to_come_back_from() {
    assert_eq!(CloseAction::for_tray(false), CloseAction::Quit);
}
