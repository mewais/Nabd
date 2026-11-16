//! What the platform the app is running on can do.

use serde::Serialize;

/// The first Windows 11 build; Mica does not exist before it.
const WINDOWS_11_BUILD: u32 = 22_000;

/// The operating system, as far as native features care.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Platform {
    Windows { build: u32 },
    MacOs,
    Linux,
}

/// The one backdrop effect used for the translucent ("Glass") window.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum GlassEffect {
    /// Windows 11's wallpaper-tinted backdrop.
    Mica,
    /// Windows 10's blur-behind (acrylic there lags badly while resizing).
    Blur,
}

/// The backdrop effect for a platform, or None where the window cannot be
/// translucent: Linux has no compositor-independent blur (a transparent window
/// would just show the sharp desktop), and macOS would need Tauri's private-API
/// transparency, which this app does not enable.
pub fn glass_effect(platform: Platform) -> Option<GlassEffect> {
    match platform {
        Platform::Windows { build } if build >= WINDOWS_11_BUILD => Some(GlassEffect::Mica),
        Platform::Windows { .. } => Some(GlassEffect::Blur),
        Platform::MacOs | Platform::Linux => None,
    }
}

/// Whether something will actually draw a tray icon, from what the
/// StatusNotifier watcher says (Linux; stock GNOME has no host).
/// `host_registered` is None when the watcher could not be asked — treated as
/// "no host", because wrongly hiding to a tray nobody draws strands the app.
pub fn tray_host_present(watcher_running: bool, host_registered: Option<bool>) -> bool {
    watcher_running && host_registered == Some(true)
}

/// What the frontend may offer on this machine.
#[derive(Clone, Copy, PartialEq, Debug, Serialize)]
pub struct Capabilities {
    /// A tray icon is shown, so the window can hide to it.
    pub tray: bool,
    /// The window can be translucent.
    pub glass: bool,
    /// The OS reports system-wide idle time.
    pub idle: bool,
}

impl Capabilities {
    /// `tray_host` is only consulted on Linux: Windows and macOS always have a tray.
    pub fn decide(platform: Platform, tray_host: bool, idle_source: bool) -> Self {
        Self {
            tray: platform != Platform::Linux || tray_host,
            glass: glass_effect(platform).is_some(),
            idle: idle_source,
        }
    }
}
