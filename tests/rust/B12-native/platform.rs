//! Platform capabilities.

use nabd_native::{glass_effect, tray_host_present, Capabilities, GlassEffect, Platform};

const WINDOWS_10: Platform = Platform::Windows { build: 19_045 };
const WINDOWS_11: Platform = Platform::Windows { build: 22_631 };

// ── glass ────────────────────────────────────────────────────────────────────

#[test]
fn windows_11_gets_mica_from_its_first_build() {
    assert_eq!(
        glass_effect(Platform::Windows { build: 22_000 }),
        Some(GlassEffect::Mica)
    );
    assert_eq!(glass_effect(WINDOWS_11), Some(GlassEffect::Mica));
}

#[test]
fn windows_10_gets_blur() {
    assert_eq!(glass_effect(WINDOWS_10), Some(GlassEffect::Blur));
    assert_eq!(
        glass_effect(Platform::Windows { build: 21_999 }),
        Some(GlassEffect::Blur)
    );
}

#[test]
fn linux_and_macos_have_no_glass() {
    assert_eq!(glass_effect(Platform::Linux), None);
    assert_eq!(glass_effect(Platform::MacOs), None);
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
        Capabilities::decide(Platform::Linux, true, true),
        Capabilities {
            tray: true,
            glass: false,
            idle: true
        }
    );
    assert!(!Capabilities::decide(Platform::Linux, false, true).tray);
}

#[test]
fn windows_always_has_a_tray_and_glass() {
    for platform in [WINDOWS_10, WINDOWS_11] {
        let capabilities = Capabilities::decide(platform, false, true);
        assert!(capabilities.tray);
        assert!(capabilities.glass);
    }
}

#[test]
fn idle_follows_whether_a_source_was_found() {
    assert!(Capabilities::decide(Platform::Linux, true, true).idle);
    assert!(!Capabilities::decide(Platform::Linux, true, false).idle);
    assert!(!Capabilities::decide(Platform::MacOs, true, false).idle);
}

#[test]
fn capabilities_serialise_as_the_three_flags_the_frontend_reads() {
    let capabilities = Capabilities::decide(WINDOWS_11, true, false);
    assert_eq!(
        serde_json::to_value(capabilities).unwrap(),
        serde_json::json!({"tray": true, "glass": true, "idle": false})
    );
}
