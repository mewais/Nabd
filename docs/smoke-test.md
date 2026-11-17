# Smoke test

```bash
# Linux
sudo apt install xvfb dbus openbox xdotool libfaketime \
  python3-dbus python3-gi gir1.2-gtk-3.0 sway wtype \
  webkit2gtk-driver                     # webkitgtk-webdriver from Ubuntu 24.10 on
cargo install tauri-driver --locked
pnpm smoke:linux                        # = scripts/smoke/linux-smoke.sh

# Windows (a spare account: it uses the account's own %APPDATA% and Run key)
cargo install tauri-driver --locked     # msedgedriver is found or downloaded to match WebView2
pnpm smoke:windows                      # = scripts/smoke/windows-smoke.mjs

# macOS (Xcode command line tools, for swiftc)
pnpm smoke:macos                        # = scripts/smoke/macos-smoke.mjs
```

What the browser cannot reach — the native shell, SQLite, the window's life cycle and the
desktop around the app — is checked on the real release binary (a debug build never touches
the login entry), built first unless `NABD_SMOKE_BINARY=<path>` names one (on macOS, the
`.app`). CI runs each platform's script after `pnpm tauri build`.

**One kit.** The expectations every platform shares are written once, in
`scripts/smoke/checks.mjs`, against `app.mjs` (the app's identifier and product name, read
from `tauri.conf.json`; the schema version, read from the persistence crate; the data folder
and login entry where Tauri and tauri-plugin-autostart put them on each platform; the
database, read with `node:sqlite`; the app's processes and the last lines they printed) and
`screen.mjs` (the window as the desktop sees it: the X server through `x11.sh`, Win32 through
`windows.ps1`, the window server's list through `macos-windows.swift`); `runner.mjs` runs
them and reports a failure. The WebDriver acts — doing things inside the window — are
`app-session.mjs`, over the small client in `webdriver.mjs`; `driver.mjs` starts and stops
`tauri-driver` with the platform's driver behind it on every platform that has one (from
`windows-smoke.mjs`, and on Linux through its command line, as a job of the session
`linux-smoke.sh` sets up). Each act starts once the driver's `/status` says it is ready for a
session, and ends once its app and window are gone. Each entry script only sets its platform
up and picks the checks (on Linux, `linux-smoke.sh` runs them through `linux-checks.mjs`).
This list is the one description of the checks:

- `first-launch` — a window; the database created at the current schema version, with the
  day state the frontend wrote; "Open at startup" (on by default) writing the login entry for
  this binary with `--autostart`; without
  one, closing the window quitting by way of the window's save.
- `restart` — a stored plan surviving, and the day that ended while the app was off rolled
  over and put on record.
- `second-instance` — a second launch exiting successfully while the first keeps running,
  one process and one window.
- `close-to-tray` — closing the window hiding it with the app still running; a second launch
  bringing it back (focused, where the platform can tell: X11).
- `login-launch` — the login entry's own command line starting the app hidden; a second login
  launch leaving it hidden, a launch by hand showing it.
- `tray-menu` — the menu reading where the day stands, Start next set, Pause nudges, Open
  Nabd, Quit; its Quit ending the app with the database sound.
- `logged-set`, `autostart-setting`, `quit-from-settings`, `system-idle` (WebDriver) — a set
  logged in the window landing in the `history` table in its day's session and, like Pause,
  surviving a restart; Settings → "Open at startup" removing the login entry and writing it
  back; Settings → Quit Nabd ending the app with the set on disk and no rollback journal
  left; the clock beat carrying the system's idle seconds, which grow with nobody at the
  computer and are reset by synthetic input.

A failure names the check and the expectation, what was found instead, the windows seen, the
data folder, the stored day, the login entry and the last lines of every launch's output.

**Linux** (`linux-smoke.sh`) runs the binary in a throw-away session (Xvfb, its own D-Bus
session, openbox) with `HOME` and the XDG directories in a temporary directory. First, with
no tray: `first-launch` (database in `$XDG_DATA_HOME/com.mewais.nabd`, entry
`~/.config/autostart/Nabd.desktop`), `restart`, `second-instance`, `logged-set`,
`autostart-setting` (and a login launch showing the window, as there is no tray to start
in), `quit-from-settings`. Then fakes of a StatusNotifier host and of the notification
service join the session (`desktop_bus.py`, over D-Bus, the way a panel and a notification
daemon would): the entry's command line starts the app hidden though the tray came up two
seconds after it, and the tray's Open shows it; `tray-menu`, `close-to-tray`,
`login-launch`; Pause and Resume from the tray stored without showing the window; Open
showing it; Start next set showing it with the logger open; with the page's script stuck, so
that the window cannot answer, the tray's Quit still ending the app once its three seconds
of grace are up. With the app's wall clock moved
by libfaketime (only the wall clock: its timers keep pace), a 5-minute interval brings a
desktop notification ("Time to move", "Push-Up — Interval's up") only once the workday has
begun, shows the hidden window again without the keyboard, repeats once per interval while
unanswered, stays quiet while snoozed or paused and after the workday. The clock beat carries
the X server's idle seconds (the screen-saver extension), which synthetic input resets; after
a set an idle moment nudges ("Push-Up — You've gone quiet") only past the minimum gap and
only while nobody touches the mouse. Last, under a headless sway (Wayland, no XWayland), the
beat carries the compositor's idle seconds (`ext-idle-notify-v1`), reset by a key. The
WebDriver parts are skipped without `tauri-driver` and `WebKitWebDriver`, the Wayland part
without sway and wtype or where a headless sway cannot start.

**Windows** (`windows-smoke.mjs`) runs on the session's own desktop, with the account's own
`%APPDATA%\com.mewais.nabd` and `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
(known folders cannot be redirected): it refuses where Nabd already has either, outside CI,
unless `NABD_SMOKE_RESET=1`, and removes what it created. It runs `first-launch`,
`restart`, `second-instance`, `close-to-tray` (closing is a `WM_CLOSE` to the window),
`login-launch`, then through `tauri-driver` and an `msedgedriver` of the WebView2 runtime's
major version (the runner's own, else downloaded from Microsoft; `NABD_SMOKE_EDGEDRIVER`
names one; it reaches the app's WebView2 over the DevTools port, which the test opens
with WebView2's `AdditionalBrowserArguments` policy for `nabd.exe` and removes again, since
WebView2 ignores the environment variable `msedgedriver` asks with once the app passes
arguments of its own) `logged-set`, `autostart-setting`, `quit-from-settings` and `system-idle`
(`GetLastInputInfo`, reset by keys sent with `SendInput`; where the session takes no
synthetic input, that half is reported as skipped). An app the test launched itself has no
window it can ask to quit, so it is ended without being asked (nothing waits to be saved).

**macOS** (`macos-smoke.mjs`) runs a copy of the `.app` with `HOME` in a temporary folder,
so the database lands in `~/Library/Application Support/com.mewais.nabd` and the login entry
in `~/Library/LaunchAgents/Nabd.plist` (`ProgramArguments`: the binary, `--autostart`) there.
WKWebView has no WebDriver, so nothing is done inside the window: it runs `first-launch`,
`restart`, `second-instance`, `close-to-tray`, `login-launch` and `tray-menu`. Windows are
seen in the window server's list, which needs no permission; closing the window (its close
button) and the menu-bar item's menu go through System Events, which needs the accessibility
permission — where the runner refuses it, those parts are reported as skipped and the app is
asked to quit as the Dock's Quit would.

The WebDriver parts fail instead of being skipped when `NABD_SMOKE_REQUIRE_WEBDRIVER=1` (as
in CI on Linux and Windows).

Not covered anywhere: a notification actually appearing on Windows (toast) or macOS
(Notification Center), and nudges at all there (the clock cannot be moved for the app, and
nothing is logged on macOS); the Windows tray icon itself (clicking it, its menu); the glass
effect's look (acrylic, blur, vibrancy); a set logged, a setting changed or idle time read on
macOS; the focus a second launch gives on Windows and macOS; the tray, notifications and idle
time of a real GNOME or KDE session (Mutter's idle monitor, KDE's screen saver), and the
Wayland tray and notifications; installing from the bundles (`.msi`, NSIS, `.dmg`, `.deb`,
`.rpm`), and Gatekeeper.
