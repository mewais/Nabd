//! Idle backend selection and tick-counter arithmetic.

use nabd_native::{idle_backends, millis_since, IdleBackend, SessionKind};

// ── session detection ────────────────────────────────────────────────────────

#[test]
fn a_wayland_display_means_a_wayland_session_even_with_xwayland() {
    assert_eq!(
        SessionKind::detect(Some("wayland-0"), Some(":0")),
        SessionKind::Wayland
    );
    assert_eq!(
        SessionKind::detect(Some("wayland-0"), None),
        SessionKind::Wayland
    );
}

#[test]
fn only_an_x_display_means_x11() {
    assert_eq!(SessionKind::detect(None, Some(":0")), SessionKind::X11);
}

#[test]
fn empty_or_missing_variables_mean_an_unknown_session() {
    assert_eq!(SessionKind::detect(None, None), SessionKind::Unknown);
    assert_eq!(
        SessionKind::detect(Some(""), Some("")),
        SessionKind::Unknown
    );
    assert_eq!(SessionKind::detect(Some(""), Some(":1")), SessionKind::X11);
}

// ── backend order ────────────────────────────────────────────────────────────

#[test]
fn gnome_is_asked_first_in_every_session() {
    for session in [SessionKind::Wayland, SessionKind::X11, SessionKind::Unknown] {
        assert_eq!(idle_backends(session)[0], IdleBackend::Mutter);
    }
}

#[test]
fn a_wayland_session_never_asks_the_x_server() {
    // XWayland's idle counter only sees input given to X clients.
    assert_eq!(
        idle_backends(SessionKind::Wayland),
        [
            IdleBackend::Mutter,
            IdleBackend::WaylandIdleNotify,
            IdleBackend::SessionIdleTime
        ]
    );
}

#[test]
fn an_x11_session_asks_the_x_server_and_never_wayland() {
    assert_eq!(
        idle_backends(SessionKind::X11),
        [
            IdleBackend::Mutter,
            IdleBackend::XScreenSaver,
            IdleBackend::SessionIdleTime
        ]
    );
}

#[test]
fn an_unknown_session_only_has_the_dbus_services() {
    assert_eq!(
        idle_backends(SessionKind::Unknown),
        [IdleBackend::Mutter, IdleBackend::SessionIdleTime]
    );
}

// ── tick counters ────────────────────────────────────────────────────────────

#[test]
fn millis_since_is_the_plain_difference() {
    assert_eq!(millis_since(10_000, 4_000), 6_000);
    assert_eq!(millis_since(4_000, 4_000), 0);
}

#[test]
fn millis_since_survives_the_counter_wrapping_around() {
    // Last input just before the 49.7-day wrap, "now" just after it.
    assert_eq!(millis_since(500, u32::MAX - 499), 1_000);
}
