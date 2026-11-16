//! Idle time from a desktop service on the session bus.

use std::time::Duration;

use zbus::blocking::{connection, Proxy};

use super::IdleSource;

/// A hung desktop service must not stall the clock that samples us.
const CALL_TIMEOUT: Duration = Duration::from_secs(2);

/// How a service encodes its millisecond reply.
#[derive(Clone, Copy)]
enum Reply {
    U64,
    U32,
}

/// A D-Bus method that returns the session's idle time in milliseconds.
pub struct DbusIdle {
    proxy: Proxy<'static>,
    method: &'static str,
    reply: Reply,
}

impl DbusIdle {
    /// GNOME Shell (X11 and Wayland).
    pub fn mutter() -> Option<Self> {
        Self::new(
            "org.gnome.Mutter.IdleMonitor",
            "/org/gnome/Mutter/IdleMonitor/Core",
            "GetIdletime",
            Reply::U64,
        )
    }

    /// `GetSessionIdleTime` of the freedesktop screen-saver interface. KDE
    /// implements it; where it is missing the call fails and the backend is
    /// skipped. (`GetActiveTime` on the same interface is something else: how
    /// long the screen has been locked.)
    pub fn screen_saver() -> Option<Self> {
        Self::new(
            "org.freedesktop.ScreenSaver",
            "/org/freedesktop/ScreenSaver",
            "GetSessionIdleTime",
            Reply::U32,
        )
    }

    /// For these services the interface is named like the bus name.
    fn new(
        service: &'static str,
        path: &'static str,
        method: &'static str,
        reply: Reply,
    ) -> Option<Self> {
        let connection = connection::Builder::session()
            .ok()?
            .method_timeout(CALL_TIMEOUT)
            .build()
            .ok()?;
        let proxy = Proxy::new(&connection, service, path, service).ok()?;
        Some(Self {
            proxy,
            method,
            reply,
        })
    }

    fn millis(&self) -> zbus::Result<u64> {
        match self.reply {
            Reply::U64 => self.proxy.call(self.method, &()),
            Reply::U32 => self.proxy.call::<_, _, u32>(self.method, &()).map(u64::from),
        }
    }
}

impl IdleSource for DbusIdle {
    fn idle(&mut self) -> Option<Duration> {
        self.millis().ok().map(Duration::from_millis)
    }
}
