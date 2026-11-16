//! Facts about the machine, gathered once at startup and turned into
//! [`Capabilities`] by `nabd-native`.

use std::time::Duration;

use nabd_native::{Capabilities, Platform};

/// How long a login launch waits for a tray host to appear: autostart entries
/// can run before the desktop's panel has registered its tray.
const TRAY_HOST_PATIENCE: Duration = Duration::from_secs(5);
const TRAY_HOST_POLL: Duration = Duration::from_millis(500);

pub fn current() -> Platform {
    #[cfg(windows)]
    return Platform::Windows {
        build: windows_version::OsVersion::current().build,
    };
    #[cfg(target_os = "macos")]
    return Platform::MacOs;
    #[cfg(not(any(windows, target_os = "macos")))]
    return Platform::Linux;
}

/// What this session can do. `at_login` allows the tray host some time to
/// come up; a manual launch decides at once.
pub fn capabilities(at_login: bool, idle_source: bool) -> Capabilities {
    let patience = if at_login {
        TRAY_HOST_PATIENCE
    } else {
        Duration::ZERO
    };
    Capabilities::decide(current(), await_tray_host(patience), idle_source)
}

/// Poll for a tray host until one is there or `patience` runs out.
fn await_tray_host(patience: Duration) -> bool {
    let polls = patience.as_millis() / TRAY_HOST_POLL.as_millis();
    for _ in 0..polls {
        if tray_host::present() {
            return true;
        }
        std::thread::sleep(TRAY_HOST_POLL);
    }
    tray_host::present()
}

/// Linux tray icons are StatusNotifier items: they only appear if a host
/// (KDE's panel, GNOME's AppIndicator extension, …) is registered with the
/// watcher. Stock GNOME has none, and then nothing draws the icon.
#[cfg(target_os = "linux")]
mod tray_host {
    use nabd_native::tray_host_present;
    use zbus::blocking::fdo::DBusProxy;
    use zbus::blocking::{Connection, Proxy};
    use zbus::names::BusName;

    const WATCHER: &str = "org.kde.StatusNotifierWatcher";
    const WATCHER_PATH: &str = "/StatusNotifierWatcher";

    pub fn present() -> bool {
        // No session bus means no watcher either.
        Connection::session().is_ok_and(|bus| {
            let running = watcher_running(&bus);
            tray_host_present(running, running.then(|| host_registered(&bus)).flatten())
        })
    }

    fn watcher_running(bus: &Connection) -> bool {
        let Ok(name) = BusName::try_from(WATCHER) else {
            return false;
        };
        DBusProxy::new(bus).is_ok_and(|dbus| dbus.name_has_owner(name).unwrap_or(false))
    }

    fn host_registered(bus: &Connection) -> Option<bool> {
        Proxy::new(bus, WATCHER, WATCHER_PATH, WATCHER)
            .ok()?
            .get_property("IsStatusNotifierHostRegistered")
            .ok()
    }
}

/// Windows and macOS always have a tray (the answer is not consulted there).
#[cfg(not(target_os = "linux"))]
mod tray_host {
    pub fn present() -> bool {
        true
    }
}
