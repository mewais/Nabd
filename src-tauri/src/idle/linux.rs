//! Linux: no single API reports idle time, so each kind of session gets the
//! backends that can work in it (the order is decided in `nabd-native`), and
//! the first one that actually answers is kept.

use nabd_native::{IdleBackend, SessionKind};

use super::{dbus::DbusIdle, wayland::WaylandIdle, x11::XScreenSaverIdle, IdleSource};

pub fn connect() -> Option<Box<dyn IdleSource>> {
    let wayland_display = std::env::var("WAYLAND_DISPLAY").ok();
    let x_display = std::env::var("DISPLAY").ok();
    SessionKind::detect(wayland_display.as_deref(), x_display.as_deref())
        .idle_backends()
        .iter()
        .find_map(|backend| answering(open(*backend)?))
}

fn open(backend: IdleBackend) -> Option<Box<dyn IdleSource>> {
    Some(match backend {
        IdleBackend::Mutter => Box::new(DbusIdle::mutter()?),
        IdleBackend::SessionIdleTime => Box::new(DbusIdle::screen_saver()?),
        IdleBackend::WaylandIdleNotify => Box::new(WaylandIdle::connect()?),
        IdleBackend::XScreenSaver => Box::new(XScreenSaverIdle::connect()?),
    })
}

/// A D-Bus proxy is created without knowing whether anything implements the
/// method behind it, so a backend only counts once it has answered.
fn answering(mut source: Box<dyn IdleSource>) -> Option<Box<dyn IdleSource>> {
    source.idle().map(|_| source)
}
