#!/usr/bin/env bash
# Smoke test of the real Nabd binary on Linux: the things the browser tests
# (e2e/) cannot reach — the native shell, SQLite, the window's life cycle, and
# the desktop around the app.
#
#   scripts/smoke/linux-smoke.sh            (or: pnpm smoke:linux)
#
# It builds the frontend and the release binary (a debug build never touches
# the login entry), then runs the binary in a throw-away desktop session (Xvfb
# + its own D-Bus session + openbox) with HOME and the XDG directories pointing
# into a temporary directory, and checks, first on a desktop with no tray:
#
#   1. first launch    a window appears; the database is created at schema
#                      version 3; the frontend boots and stores its day state;
#                      the login entry is written ("Open at startup" is on)
#   2. closing         with no tray host, closing the window quits the app, by
#                      way of the window, which saves first
#   3. restart         a plan stored before the launch is still there, and the
#                      day that ended while the app was off is rolled over
#   4. second launch   exits at once and leaves the first instance running
#   5. logging a set   (WebDriver) a set logged in the real window lands in the
#                      history table, in the session of its day, and, like
#                      Pause, survives a restart
#   6. autostart       (WebDriver) Settings → "Open at startup" removes the login
#                      entry and writes it back; a login launch with no tray
#                      shows the window
#
# then on a desktop that has a tray and a notification service (fakes of both,
# scripts/smoke/desktop_bus.py, join the session):
#
#   7. login launch    the entry's own command line starts the app hidden in the
#                      tray, even when the tray comes up after the app
#   8. tray            the item and its menu (status, Start next set, Pause
#                      nudges, Open Nabd, Quit); closing the window hides it;
#                      Pause flips and is stored without showing the window;
#                      Open shows it; Start next set opens the logger
#                      (WebDriver); Quit ends the app
#   9. single instance a second launch brings the hidden window forward and
#                      exits; a second login launch leaves it hidden
#  10. nudges          (WebDriver, with the app's wall clock moved by
#                      libfaketime) desktop notifications for the timer nudge:
#                      the workday's bounds, the repeat per interval, Snooze,
#                      Pause
#  11. idle time       (WebDriver) the clock beat carries the X server's idle
#                      seconds, reset by synthetic input; the idle-moment nudge
#                      waits for the minimum gap and for nobody at the mouse
#
# The WebDriver parts need `tauri-driver` (cargo install tauri-driver --locked)
# and `WebKitWebDriver` (apt: webkit2gtk-driver); without them they are
# skipped, or fail when NABD_SMOKE_REQUIRE_WEBDRIVER=1.
#
# Environment:
#   NABD_SMOKE_BINARY             test this binary instead of building one (a
#                                 release build, for the login entry)
#   NABD_SMOKE_REQUIRE_WEBDRIVER  1 = the WebDriver parts must run
#   NABD_SMOKE_DRIVER_PORT        tauri-driver's port (default 4444; the native
#                                 driver takes the next one)
#
# Other needs: xvfb, dbus (dbus-run-session), openbox, xdotool, sqlite3, curl,
# libfaketime, and python3-dbus with python3-gi. Exits non-zero, naming the
# failed expectation, as soon as one fails; every process it started and its
# temporary directory are gone when it returns.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SELF="$ROOT/scripts/smoke/linux-smoke.sh"
APP_ID="com.mewais.nabd"
DRIVER_PORT="${NABD_SMOKE_DRIVER_PORT:-4444}"

# ---------------------------------------------------------------- outside ---
# Build, then run this script again inside the throw-away session.

require() {
  local tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null || { echo "linux-smoke: $tool is not installed" >&2; exit 2; }
  done
}

built_binary() {
  (cd "$ROOT" && pnpm tauri build --no-bundle) >&2
  echo "${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}/release/nabd"
}

# The system Python carries the D-Bus bindings; a python3 earlier on the PATH may not.
dbus_python() {
  local python
  for python in python3 /usr/bin/python3 /usr/bin/python3.*[0-9]; do
    if "$python" -c "import dbus, gi" 2>/dev/null; then
      command -v "$python"
      return
    fi
  done
  echo "linux-smoke: no Python with python3-dbus and python3-gi" >&2
  exit 2
}

libfaketime() {
  local library
  for library in /usr/lib/*/faketime/libfaketime.so.1 /usr/lib/faketime/libfaketime.so.1; do
    [[ -e "$library" ]] && { echo "$library"; return; }
  done
  echo "linux-smoke: libfaketime is not installed" >&2
  exit 2
}

# The app, its wall clock read from $SANDBOX/clock through libfaketime.
write_faketime_launcher() {
  cat >"$SANDBOX/nabd-faketime" <<EOF
#!/bin/sh
export LD_PRELOAD="$1" FAKETIME_TIMESTAMP_FILE="$SANDBOX/clock"
export FAKETIME_NO_CACHE=1 FAKETIME_DONT_FAKE_MONOTONIC=1
exec "$SANDBOX/nabd" "\$@"
EOF
  chmod +x "$SANDBOX/nabd-faketime"
}

outside() {
  require xvfb-run dbus-run-session openbox xdotool sqlite3 curl node
  local binary python faketime status=0
  python="$(dbus_python)"
  faketime="$(libfaketime)"
  binary="${NABD_SMOKE_BINARY:-$(built_binary)}"
  SANDBOX="$(mktemp -d)"
  trap 'rm -rf "$SANDBOX"' EXIT
  # No ~/.config: a fresh account has none until something writes a setting.
  mkdir "$SANDBOX"/{home,data,config,cache}
  # A private copy: a rebuild while the test runs cannot swap the binary under it.
  cp "$binary" "$SANDBOX/nabd"
  write_faketime_launcher "$faketime"

  env -u WAYLAND_DISPLAY \
    HOME="$SANDBOX/home" XDG_DATA_HOME="$SANDBOX/data" \
    XDG_CONFIG_HOME="$SANDBOX/config" XDG_CACHE_HOME="$SANDBOX/cache" \
    GDK_BACKEND=x11 SANDBOX="$SANDBOX" NABD_SMOKE_PYTHON="$python" \
    xvfb-run -a -s "-screen 0 1440x900x24" dbus-run-session -- "$SELF" --in-session \
    3>&1 >"$SANDBOX/session.log" 2>&1 || status=$?
  if ((status != 0)); then
    echo "--- what the session printed (last lines)" >&2
    tail -n 40 "$SANDBOX/session.log" >&2
  fi
  return "$status"
}

# ----------------------------------------------------------------- inside ---

BINARY="${SANDBOX:-}/nabd"
FAKETIME_BINARY="${SANDBOX:-}/nabd-faketime"
DB="${XDG_DATA_HOME:-}/$APP_ID/nabd.sqlite"
AUTOSTART_ENTRY="${HOME:-}/.config/autostart/Nabd.desktop"
export NABD_SMOKE_CLOCK="${SANDBOX:-}/clock"
export NABD_SMOKE_NOTIFICATIONS="${SANDBOX:-}/notifications.jsonl"
CLOCK="$NABD_SMOKE_CLOCK"
NOTIFICATIONS="$NABD_SMOKE_NOTIFICATIONS"
TODAY="$(date +%F)"
YESTERDAY="$(date -d yesterday +%F)"
# shellcheck source=scripts/smoke/lib.sh
source "$ROOT/scripts/smoke/lib.sh"

# Every weekday a workday, so the day the test runs on is one.
EVERY_DAY='"workDays":[0,1,2,3,4,5,6]'

first_launch() {
  launch_shown
  ok "a window appears"
  wait_for 30 test -s "$DB" || fail "no database at $DB"
  expect "database schema version" "$(sql "SELECT value FROM app_meta WHERE key = 'version'")" 3
  ok "the database is created at schema version 3"
  wait_for 30 day_is "$TODAY" || fail "the frontend did not store today's day state"
  ok "the frontend booted and stored its day state"
  wait_for 10 test -s "$AUTOSTART_ENTRY" || fail "no login entry at $AUTOSTART_ENTRY"
  expect "the login entry's command" "$(grep '^Exec=' "$AUTOSTART_ENTRY")" "Exec=$BINARY --autostart"
  ok "\"Open at startup\" (on by default) writes the login entry, with --autostart"
  close_and_expect_exit
  ok "without a tray host, closing the window quits the app"
}

# Yesterday was skipped outright, with nudges paused: a floating plan moves on
# from such a day and puts it on record (a day it merely sat idle is not recorded).
restart_keeps_data() {
  local plan
  plan="$(plan 1)"
  sql "INSERT OR REPLACE INTO kv (key, value) VALUES
         ('program', '$plan'), ('settings', '{$EVERY_DAY}'),
         ('dayState', '{\"date\":\"$YESTERDAY\",\"dayId\":null,\"carried\":{},\"skipped\":[\"row\"],\"extras\":[],\"paused\":true}')"
  launch_shown
  wait_for 30 day_is "$TODAY" || fail "yesterday's day was not rolled over at launch"
  expect "stored plan after a restart" "$(sql "SELECT value FROM kv WHERE key = 'program'")" "$plan"
  expect "schema version after a restart" "$(sql "SELECT value FROM app_meta WHERE key = 'version'")" 3
  expect "yesterday's record: date" "$(stored dayLog '[0].date')" "$YESTERDAY"
  expect "yesterday's record: planned sets" "$(stored dayLog '[0].planned')" 1
  expect "yesterday's record: done sets" "$(stored dayLog '[0].done')" 0
  expect "pause on the new day" "$(stored dayState .paused)" 0
  ok "a restart keeps the stored plan and rolls yesterday over in the database"
}

second_instance() {
  second_launch
  expect "number of windows" "$(x11 count)" 1
  ok "a second launch exits and leaves the first instance and its one window"
  close_and_expect_exit
}

# needs_webdriver WHAT: whether the WebDriver parts can run; says so when not.
needs_webdriver() {
  if command -v tauri-driver >/dev/null && command -v WebKitWebDriver >/dev/null; then
    [[ -n "$DRIVER_PID" ]] || start_webdriver
    return 0
  fi
  [[ "${NABD_SMOKE_REQUIRE_WEBDRIVER:-}" != 1 ]] || fail "tauri-driver or WebKitWebDriver is not installed"
  ok "(skipped: $1 — tauri-driver or WebKitWebDriver is not installed)"
  return 1
}

logged_set_survives() {
  needs_webdriver "logging a set through WebDriver" || return 0
  act log-a-set
  local set="SELECT ex_id || ' ' || date || ' ' || session || ' ' || trigger || ' ' || plan_item_id FROM history"
  expect "the history table" "$(sql "$set")" "push_up__bodyweight $TODAY $TODAY manual row"
  expect "pause in the database" "$(stored dayState .paused)" 1
  ok "a set logged in the window is a row of the history table; Pause is stored"

  act after-restart
  expect "the history table after a restart" "$(sql "$set")" "push_up__bodyweight $TODAY $TODAY manual row"
  ok "after a restart the window still counts the set and nudges are still paused"
}

autostart_setting() {
  needs_webdriver "Settings → Open at startup" || return 0
  act toggle-autostart
  [[ ! -e "$AUTOSTART_ENTRY" ]] || fail "switching \"Open at startup\" off left the login entry"
  ok "switching \"Open at startup\" off removes the login entry"
  act toggle-autostart
  expect "the login entry's command" "$(grep '^Exec=' "$AUTOSTART_ENTRY")" "Exec=$BINARY --autostart"
  ok "switching it on writes the entry again"
  launch_shown --autostart
  ok "a login launch on a desktop with no tray shows the window"
  close_and_expect_exit
}

# The entry's command line, run as the desktop would at login. The tray host
# comes up two seconds later, as a panel still starting would.
login_launch() {
  local command
  read -ra command <<<"$(sed -n 's/^Exec=//p' "$AUTOSTART_ENTRY")"
  "${command[@]}" &
  APP_PID=$!
  sleep 2
  desktop_services
  wait_for 15 tray_item_registered || fail "the login launch registered no tray item"
  x11 shown && fail "a login launch showed the window"
  tray click "Open Nabd"
  wait_for 10 x11 shown || fail "the tray's Open did not show the window"
  ok "a login launch starts hidden in the tray, which came up after it; Open shows the window"
  tray click "Quit"
  expect_exit "the tray's Quit"
}

tray_menu() {
  start_day "$(plan 1)" "{$EVERY_DAY}"
  launch_shown
  wait_for 15 tray_menu_has "Next: Push-Up · 0/1 sets (disabled)" ||
    fail "tray menu: $(tray menu | paste -sd '|')"
  expect "the tray menu" "$(tray menu | paste -sd '|')" \
    "Next: Push-Up · 0/1 sets (disabled)|Start next set|Pause nudges|Open Nabd|Quit"
  ok "the tray item's menu: where the day stands, Start next set, Pause nudges, Open Nabd, Quit"

  x11 close
  wait_for 10 window_hidden || fail "closing the window did not hide it"
  sleep 1
  gone "$APP_PID" && fail "closing the window with a tray ended the app"
  ok "with a tray, closing the window hides it and the app keeps running"

  tray click "Pause nudges"
  wait_for 10 tray_menu_has "Resume nudges" || fail "the tray's Pause did not turn into Resume"
  expect "pause in the database" "$(stored dayState .paused)" 1
  x11 shown && fail "the tray's Pause showed the window"
  tray click "Resume nudges"
  wait_for 10 tray_menu_has "Pause nudges" || fail "the tray's Resume did not turn into Pause"
  expect "pause in the database" "$(stored dayState .paused)" 0
  ok "the tray's Pause and Resume are stored, and leave the window hidden"

  tray click "Open Nabd"
  wait_for 10 x11 shown || fail "the tray's Open did not show the window"
  ok "the tray's Open shows the window"

  tray click "Quit"
  expect_exit "the tray's Quit"
  ok "the tray's Quit ends the app"

  needs_webdriver "the tray's Start next set" || return 0
  act tray-start
  ok "the tray's Start next set shows the window with the logger open"
}

single_instance_focus() {
  launch_shown
  x11 close
  wait_for 10 window_hidden || fail "closing the window did not hide it"
  second_launch --autostart
  sleep 1
  x11 shown && fail "a second login launch showed the window"
  second_launch
  wait_for 10 x11 focused || fail "a second launch did not bring the window forward, focused"
  ok "a second launch brings the hidden window forward and exits; a second login launch does not"
  tray click "Quit"
  expect_exit "the tray's Quit"
}

timer_nudges() {
  needs_webdriver "desktop notifications of nudges" || return 0
  start_day "$(plan 3)" "{$EVERY_DAY,\"interval\":5,\"minGap\":5,\"idleNudge\":600,\"workStart\":540,\"workEnd\":1020}"
  fake_clock_at 08:55
  act timer-nudges "$FAKETIME_BINARY"
  ok "timer nudges notify within the workday only, again per interval, not while snoozed or paused"
}

idle_nudges() {
  needs_webdriver "idle time and the idle-moment nudge" || return 0
  start_day "$(plan 3)" "{$EVERY_DAY,\"interval\":60,\"minGap\":2,\"idleNudge\":5,\"workStart\":0,\"workEnd\":1440}"
  fake_clock_at 10:00
  act idle-nudges "$FAKETIME_BINARY"
  ok "the tick carries the X server's idle time; the idle nudge waits for the gap and for quiet"
}

inside() {
  trap cleanup EXIT
  openbox &
  first_launch
  restart_keeps_data
  second_instance
  logged_set_survives
  autostart_setting
  login_launch
  tray_menu
  single_instance_focus
  timer_nudges
  idle_nudges
  ok "all expectations met"
}

if [[ "${1:-}" == "--in-session" ]]; then
  inside
else
  outside
fi
