"""The desktop services a Linux session offers an app over D-Bus, faked for the
smoke test (scripts/smoke/linux-smoke.sh), and a client to inspect them.

    desktop_bus.py serve [--tray] [--notifications FILE]
        --tray           be the StatusNotifierWatcher, with a host registered:
                         what KDE's panel or GNOME's AppIndicator extension is
        --notifications  be the notification service (org.freedesktop.Notifications),
                         appending each notification to FILE as a JSON line
                         {"title": ..., "body": ..., "app": ...}
    desktop_bus.py tray-items              the tray items registered, one per line
    desktop_bus.py tray-menu               the tray item's menu: one line per entry,
                                           "<label>" or "<label> (disabled)"
    desktop_bus.py tray-click LABEL        choose the menu entry labelled LABEL, as a
                                           click in the host's menu would

Needs python3-dbus and python3-gi (apt), which the system Python provides.
"""

import json
import sys

import dbus
import dbus.service
from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib

WATCHER = "org.kde.StatusNotifierWatcher"
WATCHER_PATH = "/StatusNotifierWatcher"
ITEM = "org.kde.StatusNotifierItem"
DBUSMENU = "com.canonical.dbusmenu"
NOTIFICATIONS = "org.freedesktop.Notifications"
NOTIFICATIONS_PATH = "/org/freedesktop/Notifications"
PROPERTIES = "org.freedesktop.DBus.Properties"


class Watcher(dbus.service.Object):
    """org.kde.StatusNotifierWatcher, which also counts as the one host."""

    def __init__(self, bus):
        self.items = []
        self.bus_name = dbus.service.BusName(WATCHER, bus)
        super().__init__(self.bus_name, WATCHER_PATH)
        bus.add_signal_receiver(
            self._owner_changed, "NameOwnerChanged", "org.freedesktop.DBus"
        )

    @dbus.service.method(WATCHER, in_signature="s", sender_keyword="sender")
    def RegisterStatusNotifierItem(self, service, sender):
        # An item names its object path (libappindicator) or its bus name.
        item = f"{sender}{service}" if service.startswith("/") else f"{service}/StatusNotifierItem"
        if item not in self.items:
            self.items.append(item)
            self.StatusNotifierItemRegistered(item)

    @dbus.service.method(WATCHER, in_signature="s")
    def RegisterStatusNotifierHost(self, _service):
        pass

    @dbus.service.signal(WATCHER, signature="s")
    def StatusNotifierItemRegistered(self, item):
        pass

    @dbus.service.signal(WATCHER, signature="s")
    def StatusNotifierItemUnregistered(self, item):
        pass

    @dbus.service.signal(WATCHER, signature="")
    def StatusNotifierHostRegistered(self):
        pass

    @dbus.service.method(PROPERTIES, in_signature="ss", out_signature="v")
    def Get(self, interface, name):
        return self.GetAll(interface)[name]

    @dbus.service.method(PROPERTIES, in_signature="s", out_signature="a{sv}")
    def GetAll(self, _interface):
        return {
            "RegisteredStatusNotifierItems": dbus.Array(self.items, signature="s"),
            "IsStatusNotifierHostRegistered": dbus.Boolean(True),
            "ProtocolVersion": dbus.Int32(0),
        }

    def _owner_changed(self, name, _old, new):
        # An item whose owner left the bus is gone.
        if new == "" and name.startswith(":"):
            for item in [i for i in self.items if i.startswith(name + "/")]:
                self.items.remove(item)
                self.StatusNotifierItemUnregistered(item)


class Notifications(dbus.service.Object):
    """org.freedesktop.Notifications, writing down what it is asked to show."""

    def __init__(self, bus, log):
        self.log = log
        self.next_id = 1
        self.bus_name = dbus.service.BusName(NOTIFICATIONS, bus)
        super().__init__(self.bus_name, NOTIFICATIONS_PATH)

    @dbus.service.method(NOTIFICATIONS, in_signature="susssasa{sv}i", out_signature="u")
    def Notify(self, app, replaces, _icon, summary, body, _actions, _hints, _timeout):
        with open(self.log, "a", encoding="utf-8") as log:
            log.write(json.dumps({"title": summary, "body": body, "app": app}) + "\n")
        if replaces:
            return replaces
        self.next_id += 1
        return self.next_id - 1

    @dbus.service.method(NOTIFICATIONS, in_signature="u")
    def CloseNotification(self, _id):
        pass

    @dbus.service.method(NOTIFICATIONS, out_signature="as")
    def GetCapabilities(self):
        return ["body"]

    @dbus.service.method(NOTIFICATIONS, out_signature="ssss")
    def GetServerInformation(self):
        return ("nabd-smoke", "nabd", "1", "1.2")


def serve(args):
    DBusGMainLoop(set_as_default=True)
    bus = dbus.SessionBus()
    services = []
    if "--tray" in args:
        services.append(Watcher(bus))
    if "--notifications" in args:
        services.append(Notifications(bus, args[args.index("--notifications") + 1]))
    if not services:
        sys.exit("serve: nothing to serve (--tray and/or --notifications)")
    GLib.MainLoop().run()


def registered_items(bus):
    watcher = bus.get_object(WATCHER, WATCHER_PATH)
    return [str(i) for i in watcher.Get(WATCHER, "RegisteredStatusNotifierItems", dbus_interface=PROPERTIES)]


def tray_menu(bus):
    """The dbusmenu object of the one registered item."""
    items = registered_items(bus)
    if len(items) != 1:
        sys.exit(f"expected one tray item, found {len(items)}")
    name, _, path = items[0].partition("/")
    menu_path = bus.get_object(name, "/" + path).Get(ITEM, "Menu", dbus_interface=PROPERTIES)
    return dbus.Interface(bus.get_object(name, menu_path), DBUSMENU)


def menu_entries(menu):
    """(id, label, enabled) of each top-level entry that is shown."""
    _revision, (_root, _props, children) = menu.GetLayout(0, 1, ["label", "enabled", "visible"])
    entries = []
    for _id, props, _children in children:
        if not props.get("visible", True) or "label" not in props:
            continue
        label = str(props["label"]).replace("_", "")
        entries.append((int(_id), label, bool(props.get("enabled", True))))
    return entries


def main():
    command, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("", [])
    if command == "serve":
        return serve(args)
    bus = dbus.SessionBus()
    if command == "tray-items":
        print("\n".join(registered_items(bus)))
    elif command == "tray-menu":
        for _id, label, enabled in menu_entries(tray_menu(bus)):
            print(label if enabled else f"{label} (disabled)")
    elif command == "tray-click" and len(args) == 1:
        menu = tray_menu(bus)
        ids = [i for i, label, _enabled in menu_entries(menu) if label == args[0]]
        if not ids:
            sys.exit(f"no tray menu entry labelled {args[0]!r}")
        menu.Event(ids[0], "clicked", dbus.Int32(0, variant_level=1), dbus.UInt32(0))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
