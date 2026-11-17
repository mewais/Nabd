//! X11: the MIT-SCREEN-SAVER extension keeps the server-side idle counter.
//! Spoken over the wire with x11rb, so libXss is not linked.

use std::time::Duration;

use x11rb::connection::Connection;
use x11rb::protocol::screensaver::ConnectionExt;
use x11rb::protocol::xproto::Window;
use x11rb::rust_connection::RustConnection;

use super::IdleSource;

pub struct XScreenSaverIdle {
    connection: RustConnection,
    root: Window,
}

impl XScreenSaverIdle {
    /// Connect to `$DISPLAY`.
    pub fn connect() -> Option<Self> {
        let (connection, screen) = x11rb::connect(None).ok()?;
        let root = connection.setup().roots.get(screen)?.root;
        Some(Self { connection, root })
    }
}

impl IdleSource for XScreenSaverIdle {
    fn idle(&mut self) -> Option<Duration> {
        let info = self
            .connection
            .screensaver_query_info(self.root)
            .ok()?
            .reply()
            .ok()?;
        Some(Duration::from_millis(u64::from(info.ms_since_user_input)))
    }
}
