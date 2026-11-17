//! What the platform the app is running on can do.

use serde::Serialize;

/// The first Windows build whose compositor draws acrylic behind a window
/// itself (Windows 11 22H2 and its previews). Before it acrylic can only be
/// had through an undocumented call that lags badly while the window moves.
const SYSTEM_ACRYLIC_BUILD: u32 = 22_523;

/// The supported platforms, each with the fact native features turn on.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Platform {
    Windows {
        build: u32,
    },
    Linux {
        /// Something draws tray icons in this session (see [`tray_host_present`]).
        tray_host: bool,
    },
    /// Every supported macOS has the menu bar and vibrancy, so there is
    /// nothing to detect.
    MacOs,
}

/// The one backdrop effect used for the translucent ("Glass") window.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum GlassEffect {
    /// Windows 11's frosted acrylic: what is behind the window shows through,
    /// blurred. (Not Mica: Mica is opaque, a wash of the wallpaper's colour,
    /// so the window would not look translucent at all.)
    Acrylic,
    /// Plain blur-behind, for Windows builds without the compositor's acrylic.
    Blur,
    /// macOS's under-window vibrancy: a blur that follows the light or dark
    /// appearance by itself, which suits a window whose tint the frontend paints.
    Vibrancy,
}

impl Platform {
    /// The backdrop effect, or None where the window cannot be translucent:
    /// Linux has no compositor-independent blur (a transparent window would
    /// just show the sharp desktop).
    pub fn glass_effect(self) -> Option<GlassEffect> {
        match self {
            Self::Windows { build } if build >= SYSTEM_ACRYLIC_BUILD => Some(GlassEffect::Acrylic),
            Self::Windows { .. } => Some(GlassEffect::Blur),
            Self::MacOs => Some(GlassEffect::Vibrancy),
            Self::Linux { .. } => None,
        }
    }

    /// Whether a tray icon will be shown: always on Windows and macOS (the
    /// menu bar); on Linux only when a host draws it.
    pub fn has_tray(self) -> bool {
        match self {
            Self::Windows { .. } | Self::MacOs => true,
            Self::Linux { tray_host } => tray_host,
        }
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
    pub fn decide(platform: Platform, idle_source: bool) -> Self {
        Self {
            tray: platform.has_tray(),
            glass: platform.glass_effect().is_some(),
            idle: idle_source,
        }
    }
}
