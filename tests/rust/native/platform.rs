//! Platform capabilities.

use nabd_native::{
    kde_session, tray_host_present, Backdrop, Capabilities, Compositor, GlassEffect, Platform,
};

const WINDOWS_10: Platform = Platform::Windows { build: 19_045 };
const WINDOWS_11: Platform = Platform::Windows { build: 22_631 };
const LINUX_WITH_TRAY: Platform = linux(true, Compositor::Other);
const LINUX_WITHOUT_TRAY: Platform = linux(false, Compositor::Other);
const MACOS: Platform = Platform::MacOs;

const fn linux(tray_host: bool, compositor: Compositor) -> Platform {
    Platform::Linux {
        tray_host,
        compositor,
    }
}

// ── glass ────────────────────────────────────────────────────────────────────

#[test]
fn windows_11_gets_acrylic_from_the_first_build_whose_compositor_draws_it() {
    assert_eq!(
        Platform::Windows { build: 22_523 }.glass_effect(),
        Some(GlassEffect::Acrylic)
    );
    assert_eq!(WINDOWS_11.glass_effect(), Some(GlassEffect::Acrylic));
}

#[test]
fn earlier_windows_gets_blur() {
    assert_eq!(WINDOWS_10.glass_effect(), Some(GlassEffect::Blur));
    // Windows 11's first release (21H2) has no compositor acrylic either.
    assert_eq!(
        Platform::Windows { build: 22_000 }.glass_effect(),
        Some(GlassEffect::Blur)
    );
    assert_eq!(
        Platform::Windows { build: 22_522 }.glass_effect(),
        Some(GlassEffect::Blur)
    );
}

#[test]
fn linux_gets_kwin_blur_on_kde_with_an_x11_window() {
    assert_eq!(
        linux(true, Compositor::KWinX11).glass_effect(),
        Some(GlassEffect::KWinBlur)
    );
}

#[test]
fn other_compositing_linux_desktops_get_a_plain_transparent_window() {
    assert_eq!(
        LINUX_WITH_TRAY.glass_effect(),
        Some(GlassEffect::Transparent)
    );
    assert_eq!(
        LINUX_WITHOUT_TRAY.glass_effect(),
        Some(GlassEffect::Transparent)
    );
}

#[test]
fn linux_without_a_compositor_has_no_glass() {
    assert_eq!(linux(true, Compositor::Absent).glass_effect(), None);
    assert_eq!(linux(false, Compositor::Absent).glass_effect(), None);
}

#[test]
fn only_plain_transparency_leaves_the_desktop_sharp() {
    use GlassEffect::{Acrylic, Blur, KWinBlur, Transparent, Vibrancy};
    for blurred in [Acrylic, Blur, Vibrancy, KWinBlur] {
        assert_eq!(blurred.backdrop(), Backdrop::Blurred, "{blurred:?}");
    }
    assert_eq!(Transparent.backdrop(), Backdrop::SeeThrough);
}

// ── compositor ───────────────────────────────────────────────────────────────

#[test]
fn nothing_composites_without_a_compositing_screen_whatever_the_desktop() {
    for (x11_window, kde) in [(true, true), (true, false), (false, true), (false, false)] {
        assert_eq!(
            Compositor::detect(false, x11_window, kde),
            Compositor::Absent
        );
    }
}

#[test]
fn kwin_is_asked_for_blur_only_for_an_x11_window_in_a_kde_session() {
    assert_eq!(Compositor::detect(true, true, true), Compositor::KWinX11);
    // KDE on Wayland, and X11 desktops other than KDE.
    assert_eq!(Compositor::detect(true, false, true), Compositor::Other);
    assert_eq!(Compositor::detect(true, true, false), Compositor::Other);
    assert_eq!(Compositor::detect(true, false, false), Compositor::Other);
}

#[test]
fn a_kde_session_is_named_in_the_current_desktop_list() {
    assert!(kde_session(Some("KDE"), None));
    assert!(kde_session(Some("kde"), None));
    assert!(kde_session(Some("ubuntu:KDE"), None));
    assert!(!kde_session(Some("GNOME"), None));
    assert!(!kde_session(Some("ubuntu:GNOME"), None));
    // A name that merely contains the letters is another desktop.
    assert!(!kde_session(Some("KDE-like"), None));
    assert!(!kde_session(Some(""), None));
    assert!(!kde_session(None, None));
}

#[test]
fn a_kde_session_is_also_told_by_kde_full_session() {
    assert!(kde_session(None, Some("true")));
    assert!(kde_session(Some("GNOME"), Some("true")));
    assert!(!kde_session(None, Some("")));
    assert!(!kde_session(None, Some("false")));
}

#[test]
fn macos_gets_vibrancy() {
    assert_eq!(MACOS.glass_effect(), Some(GlassEffect::Vibrancy));
}

// ── tray host ────────────────────────────────────────────────────────────────

#[test]
fn a_tray_host_needs_a_running_watcher_that_reports_one() {
    assert!(tray_host_present(true, Some(true)));
    assert!(!tray_host_present(true, Some(false)));
    assert!(!tray_host_present(false, None));
}

#[test]
fn a_watcher_that_cannot_be_asked_counts_as_no_host() {
    assert!(!tray_host_present(true, None));
}

// ── capabilities ─────────────────────────────────────────────────────────────

#[test]
fn linux_has_a_tray_only_with_a_host() {
    assert!(Capabilities::decide(LINUX_WITH_TRAY, true).tray);
    assert!(!Capabilities::decide(LINUX_WITHOUT_TRAY, true).tray);
}

#[test]
fn linux_glass_is_blurred_under_kwin_see_through_elsewhere_and_absent_without_a_compositor() {
    let glass = |compositor| Capabilities::decide(linux(true, compositor), true).glass;
    assert_eq!(glass(Compositor::KWinX11), Some(Backdrop::Blurred));
    assert_eq!(glass(Compositor::Other), Some(Backdrop::SeeThrough));
    assert_eq!(glass(Compositor::Absent), None);
}

#[test]
fn windows_always_has_a_tray_and_blurred_glass() {
    for platform in [WINDOWS_10, WINDOWS_11] {
        let capabilities = Capabilities::decide(platform, true);
        assert!(capabilities.tray);
        assert_eq!(capabilities.glass, Some(Backdrop::Blurred));
    }
}

#[test]
fn macos_always_has_a_tray_and_blurred_glass() {
    assert_eq!(
        Capabilities::decide(MACOS, true),
        Capabilities {
            tray: true,
            glass: Some(Backdrop::Blurred),
            idle: true
        }
    );
}

#[test]
fn idle_follows_whether_a_source_was_found() {
    assert!(Capabilities::decide(LINUX_WITH_TRAY, true).idle);
    assert!(!Capabilities::decide(LINUX_WITH_TRAY, false).idle);
    assert!(!Capabilities::decide(WINDOWS_11, false).idle);
    assert!(!Capabilities::decide(MACOS, false).idle);
}

#[test]
fn capabilities_serialise_as_the_fields_the_frontend_reads() {
    let serialised =
        |platform| serde_json::to_value(Capabilities::decide(platform, false)).unwrap();
    assert_eq!(
        serialised(WINDOWS_11),
        serde_json::json!({"tray": true, "glass": "blurred", "idle": false})
    );
    assert_eq!(
        serialised(LINUX_WITHOUT_TRAY),
        serde_json::json!({"tray": false, "glass": "seeThrough", "idle": false})
    );
    assert_eq!(
        serialised(linux(false, Compositor::Absent)),
        serde_json::json!({"tray": false, "glass": null, "idle": false})
    );
}
