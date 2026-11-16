//! Linux: tray icons are StatusNotifier items, which only appear if a host
//! (KDE's panel, GNOME's AppIndicator extension, …) is registered with the
//! watcher. Stock GNOME has none, and then nothing draws the icon.

use std::time::Duration;

use nabd_native::{tray_host_present, Platform};
use zbus::blocking::fdo::DBusProxy;
use zbus::blocking::{Connection, Proxy};
use zbus::names::BusName;

/// How long a login launch waits for a tray host to appear: autostart entries
/// can run before the desktop's panel has registered its tray.
const TRAY_HOST_PATIENCE: Duration = Duration::from_secs(5);
const TRAY_HOST_POLL: Duration = Duration::from_millis(500);

const WATCHER: &str = "org.kde.StatusNotifierWatcher";
const WATCHER_PATH: &str = "/StatusNotifierWatcher";

/// `at_login` allows the tray host some time to come up; a manual launch
/// decides at once.
pub fn detect(at_login: bool) -> Platform {
    let patience = if at_login {
        TRAY_HOST_PATIENCE
    } else {
        Duration::ZERO
    };
    Platform::Linux {
        tray_host: await_tray_host(patience),
    }
}

/// Poll for a tray host until one is there or `patience` runs out.
fn await_tray_host(patience: Duration) -> bool {
    let polls = patience.as_millis() / TRAY_HOST_POLL.as_millis();
    for _ in 0..polls {
        if tray_host_is_present() {
            return true;
        }
        std::thread::sleep(TRAY_HOST_POLL);
    }
    tray_host_is_present()
}

fn tray_host_is_present() -> bool {
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
