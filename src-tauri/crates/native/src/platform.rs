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
        /// What composites the window onto the desktop (see [`Compositor::detect`]).
        compositor: Compositor,
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
    /// KWin's blur-behind (KDE Plasma on X11), which KWin draws behind a
    /// transparent window that asks for it.
    KWinBlur,
    /// A transparent window and nothing more: the desktop shows through sharp.
    /// What every other compositing Linux desktop gets.
    Transparent,
}

impl GlassEffect {
    /// How what is behind the window looks through it.
    pub fn backdrop(self) -> Backdrop {
        match self {
            Self::Acrylic | Self::Blur | Self::Vibrancy | Self::KWinBlur => Backdrop::Blurred,
            Self::Transparent => Backdrop::SeeThrough,
        }
    }
}

/// What the desktop looks like through the translucent window, which decides
/// how strong a tint the frontend must paint for its text to stay readable.
#[derive(Clone, Copy, PartialEq, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Backdrop {
    /// Blurred by the OS or the compositor.
    Blurred,
    /// Sharp, exactly as it is.
    SeeThrough,
}

/// What composites windows onto a Linux desktop, as far as the translucent
/// window is concerned.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Compositor {
    /// Nothing does (an X11 window manager without a compositor): a
    /// transparent window would show black or garbage where it is clear.
    Absent,
    /// KWin, with the window on X11, where a window property asks it to blur.
    /// (On Wayland KWin wants its own protocol, which GTK 3 does not expose.)
    KWinX11,
    /// Any other compositor, KWin on Wayland included: no blur to ask for.
    Other,
}

impl Compositor {
    /// From whether the screen is composited (and offers windows an alpha
    /// channel), whether the window is an X11 one, and whether this is a KDE
    /// session (see [`kde_session`]).
    pub fn detect(composited: bool, x11_window: bool, kde: bool) -> Self {
        if !composited {
            Self::Absent
        } else if x11_window && kde {
            Self::KWinX11
        } else {
            Self::Other
        }
    }
}

/// Whether this is a KDE Plasma session, from `XDG_CURRENT_DESKTOP` (a
/// colon-separated list of desktop names, which names "KDE" on Plasma) and
/// `KDE_FULL_SESSION` ("true" in every Plasma session, older ones included).
pub fn kde_session(current_desktop: Option<&str>, kde_full_session: Option<&str>) -> bool {
    let listed = current_desktop.is_some_and(|names| {
        names
            .split(':')
            .any(|name| name.eq_ignore_ascii_case("KDE"))
    });
    listed || kde_full_session == Some("true")
}

impl Platform {
    /// The backdrop effect, or None where the window cannot be translucent:
    /// a Linux desktop that composites nothing. Linux has no blur of its own,
    /// so only KWin's can be had; elsewhere the window is merely transparent.
    pub fn glass_effect(self) -> Option<GlassEffect> {
        match self {
            Self::Windows { build } if build >= SYSTEM_ACRYLIC_BUILD => Some(GlassEffect::Acrylic),
            Self::Windows { .. } => Some(GlassEffect::Blur),
            Self::MacOs => Some(GlassEffect::Vibrancy),
            Self::Linux { compositor, .. } => match compositor {
                Compositor::Absent => None,
                Compositor::KWinX11 => Some(GlassEffect::KWinBlur),
                Compositor::Other => Some(GlassEffect::Transparent),
            },
        }
    }

    /// Whether a tray icon will be shown: always on Windows and macOS (the
    /// menu bar); on Linux only when a host draws it.
    pub fn has_tray(self) -> bool {
        match self {
            Self::Windows { .. } | Self::MacOs => true,
            Self::Linux { tray_host, .. } => tray_host,
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
    /// The window can be translucent, and how the desktop looks through it;
    /// None where it cannot.
    pub glass: Option<Backdrop>,
    /// The OS reports system-wide idle time.
    pub idle: bool,
}

impl Capabilities {
    pub fn decide(platform: Platform, idle_source: bool) -> Self {
        Self {
            tray: platform.has_tray(),
            glass: platform.glass_effect().map(GlassEffect::backdrop),
            idle: idle_source,
        }
    }
}
