//! Which idle-time backend to ask, and the arithmetic of tick counters.

/// The kind of graphical session a Linux process is in.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum SessionKind {
    Wayland,
    X11,
    /// Neither display variable is set.
    Unknown,
}

impl SessionKind {
    /// From `WAYLAND_DISPLAY` and `DISPLAY`. Wayland wins when both are set:
    /// that is a Wayland session with XWayland, whose X idle counter only sees
    /// input given to X clients.
    pub fn detect(wayland_display: Option<&str>, x_display: Option<&str>) -> Self {
        let set = |value: Option<&str>| value.is_some_and(|v| !v.is_empty());
        if set(wayland_display) {
            Self::Wayland
        } else if set(x_display) {
            Self::X11
        } else {
            Self::Unknown
        }
    }

    /// The backends worth trying in this session, best first; the first that
    /// answers is used. Mutter leads because it is the only one GNOME offers:
    /// it has neither the Wayland protocol nor `GetSessionIdleTime`.
    pub fn idle_backends(self) -> &'static [IdleBackend] {
        use IdleBackend::{Mutter, SessionIdleTime, WaylandIdleNotify, XScreenSaver};
        match self {
            Self::Wayland => &[Mutter, WaylandIdleNotify, SessionIdleTime],
            Self::X11 => &[Mutter, XScreenSaver, SessionIdleTime],
            Self::Unknown => &[Mutter, SessionIdleTime],
        }
    }
}

/// A way of asking a Linux desktop how long the user has been idle.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum IdleBackend {
    /// GNOME: `org.gnome.Mutter.IdleMonitor` over D-Bus (X11 and Wayland).
    Mutter,
    /// Wayland compositors: the `ext-idle-notify-v1` protocol.
    WaylandIdleNotify,
    /// X11: the MIT-SCREEN-SAVER extension's idle counter.
    XScreenSaver,
    /// `org.freedesktop.ScreenSaver.GetSessionIdleTime` (KDE implements it).
    SessionIdleTime,
}

/// Milliseconds from `earlier` to `now` on a 32-bit millisecond tick counter
/// (Windows' `GetTickCount`), which wraps around every 49.7 days.
pub fn millis_since(now: u32, earlier: u32) -> u64 {
    u64::from(now.wrapping_sub(earlier))
}
