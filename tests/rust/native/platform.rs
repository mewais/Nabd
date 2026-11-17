//! Platform capabilities.

use nabd_native::{tray_host_present, Capabilities, GlassEffect, Platform};

const WINDOWS_10: Platform = Platform::Windows { build: 19_045 };
const WINDOWS_11: Platform = Platform::Windows { build: 22_631 };
const LINUX_WITH_TRAY: Platform = Platform::Linux { tray_host: true };
const LINUX_WITHOUT_TRAY: Platform = Platform::Linux { tray_host: false };
const MACOS: Platform = Platform::MacOs;

// ── glass ────────────────────────────────────────────────────────────────────

#[test]
fn windows_11_gets_mica_from_its_first_build() {
    assert_eq!(
        Platform::Windows { build: 22_000 }.glass_effect(),
        Some(GlassEffect::Mica)
    );
    assert_eq!(WINDOWS_11.glass_effect(), Some(GlassEffect::Mica));
}

#[test]
fn windows_10_gets_blur() {
    assert_eq!(WINDOWS_10.glass_effect(), Some(GlassEffect::Blur));
    assert_eq!(
        Platform::Windows { build: 21_999 }.glass_effect(),
        Some(GlassEffect::Blur)
    );
}

#[test]
fn linux_has_no_glass() {
    assert_eq!(LINUX_WITH_TRAY.glass_effect(), None);
    assert_eq!(LINUX_WITHOUT_TRAY.glass_effect(), None);
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
fn linux_has_a_tray_only_with_a_host_and_never_glass() {
    assert_eq!(
        Capabilities::decide(LINUX_WITH_TRAY, true),
        Capabilities {
            tray: true,
            glass: false,
            idle: true
        }
    );
    assert!(!Capabilities::decide(LINUX_WITHOUT_TRAY, true).tray);
}

#[test]
fn windows_always_has_a_tray_and_glass() {
    for platform in [WINDOWS_10, WINDOWS_11] {
        let capabilities = Capabilities::decide(platform, true);
        assert!(capabilities.tray);
        assert!(capabilities.glass);
    }
}

#[test]
fn macos_always_has_a_tray_and_glass() {
    assert_eq!(
        Capabilities::decide(MACOS, true),
        Capabilities {
            tray: true,
            glass: true,
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
fn capabilities_serialise_as_the_three_flags_the_frontend_reads() {
    let capabilities = Capabilities::decide(WINDOWS_11, false);
    assert_eq!(
        serde_json::to_value(capabilities).unwrap(),
        serde_json::json!({"tray": true, "glass": true, "idle": false})
    );
}
