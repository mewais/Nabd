#!/usr/bin/env bash
# Smoke test of the real Nabd binary on Linux, in a throw-away desktop session
# (Xvfb, its own D-Bus session, openbox; a headless sway for Wayland):
#
#   scripts/smoke/linux-smoke.sh            (or: pnpm smoke:linux)
#
# What it checks, and what it needs installed, is in docs/smoke-test.md.
# Exits non-zero, naming the failed expectation, as soon as one fails; every
# process it started and its temporary directory are gone when it returns.
#
# Environment:
#   NABD_SMOKE_BINARY             test this binary instead of building one (a
#                                 release build, for the login entry)
#   NABD_SMOKE_REQUIRE_WEBDRIVER  1 = the WebDriver parts must run
#   NABD_SMOKE_DRIVER_PORT        tauri-driver's port (default 4444; the native
#                                 driver takes the next one)

set -euo pipefail

SMOKE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRIVER_PORT="${NABD_SMOKE_DRIVER_PORT:-4444}"

# ---------------------------------------------------------------- outside ---
# Build, then run this script again inside the throw-away session.

require() {
  local tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null || {
      echo "linux-smoke: $tool is not installed" >&2
      exit 2
    }
  done
}

# The system Python carries the D-Bus bindings; a python3 earlier on the PATH may not.
dbus_python() {
  local python
  for python in python3 /usr/bin/python3 /usr/bin/python3.*[0-9]; do
    if "$python" -c "import dbus, gi; gi.require_version('Gtk', '3.0')" 2>/dev/null; then
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
    [[ -e "$library" ]] && {
      echo "$library"
      return
    }
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
  require xvfb-run dbus-run-session openbox xdotool node
  local binary python faketime status=0
  python="$(dbus_python)"
  faketime="$(libfaketime)"
  binary="$(node "$SMOKE/app.mjs" built-binary nabd)"
  SANDBOX="$(mktemp -d)"
  STILL_RUNNING="" FOLLOWER=""
  trap 'kill $STILL_RUNNING $FOLLOWER 2>/dev/null || true; rm -rf "$SANDBOX"' EXIT
  # No ~/.config: a fresh account has none until something writes a setting.
  mkdir "$SANDBOX"/{home,data,config,cache}
  # A private copy: a rebuild while the test runs cannot swap the binary under it.
  cp "$binary" "$SANDBOX/nabd"
  write_faketime_launcher "$faketime"

  # The results are written to a file and followed here: xvfb-run and
  # dbus-run-session need not pass any descriptor but the standard three on.
  # The follower stops once STILL_RUNNING is gone (ended with the session),
  # after printing what is left.
  : >"$SANDBOX/results"
  sleep infinity &
  STILL_RUNNING=$!
  tail -n +1 -f --pid="$STILL_RUNNING" "$SANDBOX/results" &
  FOLLOWER=$!
  env -u WAYLAND_DISPLAY \
    HOME="$SANDBOX/home" XDG_DATA_HOME="$SANDBOX/data" \
    XDG_CONFIG_HOME="$SANDBOX/config" XDG_CACHE_HOME="$SANDBOX/cache" \
    GDK_BACKEND=x11 NO_AT_BRIDGE=1 SANDBOX="$SANDBOX" NABD_SMOKE_PYTHON="$python" \
    xvfb-run -a -s "-screen 0 1440x900x24" dbus-run-session -- "$SMOKE/linux-smoke.sh" --in-session \
    >"$SANDBOX/session.log" 2>&1 || status=$?
  kill "$STILL_RUNNING"
  wait "$FOLLOWER"
  if ((status != 0)); then
    echo "--- what the session printed (last lines)" >&2
    tail -n 60 "$SANDBOX/session.log" >&2
  fi
  return "$status"
}

# ----------------------------------------------------------------- inside ---

BINARY="${SANDBOX:-}/nabd"
FAKETIME_BINARY="${SANDBOX:-}/nabd-faketime"
export NABD_SMOKE_CLOCK="${SANDBOX:-}/clock"
export NABD_SMOKE_NOTIFICATIONS="${SANDBOX:-}/notifications.jsonl"
NOTIFICATIONS="$NABD_SMOKE_NOTIFICATIONS"
# shellcheck source=scripts/smoke/lib.sh
source "$SMOKE/lib.sh"

# The login entry's command line, run as the desktop would at login. The tray
# host comes up two seconds later, as a panel still starting would.
login_launch() {
  local command
  mapfile -t command < <(app_data login-command)
  ((${#command[@]} > 0)) || fail "no login entry to launch"
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

# Pause and Resume, Skip today and Resume today from the tray, with the window
# hidden; Open; Start next set. The workday is all day, so the day can be skipped
# whenever this runs.
tray_actions() {
  start_day 1 '{"workStart":0,"workEnd":1440}'
  launch_shown
  wait_for 15 tray_menu_has "Pause nudges" || fail "tray menu: $(tray menu | paste -sd '|')"
  x11 close
  wait_for 10 window_hidden || fail "closing the window did not hide it"

  tray click "Pause nudges"
  wait_for 10 tray_menu_has "Resume nudges" || fail "the tray's Pause did not turn into Resume"
  expect "pause in the database" "$(stored dayState .paused)" 1
  x11 shown && fail "the tray's Pause showed the window"
  tray click "Resume nudges"
  wait_for 10 tray_menu_has "Pause nudges" || fail "the tray's Resume did not turn into Pause"
  expect "pause in the database" "$(stored dayState .paused)" 0
  ok "the tray's Pause and Resume are stored, and leave the window hidden"

  tray click "Skip today"
  wait_for 10 tray_menu_has "Resume today" || fail "the tray's Skip today did not turn into Resume today"
  expect "the skip in the database" "$(stored dayState .override)" skipped
  x11 shown && fail "the tray's Skip today showed the window"
  tray click "Resume today"
  wait_for 10 tray_menu_has "Skip today" || fail "the tray's Resume today did not turn into Skip today"
  expect "the skip in the database" "$(stored dayState .override)" ""
  ok "the tray's Skip today and Resume today are stored, and leave the window hidden"

  tray click "Open Nabd"
  wait_for 10 x11 shown || fail "the tray's Open did not show the window"
  ok "the tray's Open shows the window"
  tray click "Quit"
  expect_exit "the tray's Quit"

  needs_webdriver "the tray's Start next set" || return 0
  act tray-start
  ok "the tray's Start next set shows the window with the logger open"
  act unanswered-quit
  ok "the tray's Quit ends the app after three seconds when the window cannot answer"
}

timer_nudges() {
  needs_webdriver "desktop notifications of nudges" || return 0
  start_day 3 '{"interval":5,"minGap":5,"idleNudge":600,"workStart":540,"workEnd":1020}'
  fake_clock_at 08:55
  act timer-nudges "$FAKETIME_BINARY"
  ok "timer nudges notify within the workday only, again per interval, not while snoozed or paused"
}

idle_nudges() {
  needs_webdriver "idle time and the idle-moment nudge" || return 0
  start_day 3 '{"interval":60,"minGap":2,"idleNudge":5,"workStart":0,"workEnd":1440}'
  fake_clock_at 10:00
  act idle-nudges "$FAKETIME_BINARY"
  ok "the tick carries the X server's idle time; the idle nudge waits for the gap and for quiet"
}

# A headless sway: a Wayland session (no XWayland) whose idle time comes from
# ext-idle-notify-v1, as on KDE, Sway or Hyprland. Its runtime directory is
# short-named: a Wayland socket's path must fit in 108 bytes.
wayland_idle() {
  if ! command -v sway >/dev/null || ! command -v wtype >/dev/null; then
    ok "(skipped: idle time under Wayland — sway or wtype is not installed)"
    return
  fi
  needs_webdriver "idle time under Wayland" || return 0
  local runtime
  runtime="$(mktemp -d /tmp/nabd-wl.XXXXXX)"
  (
    export XDG_RUNTIME_DIR="$runtime" GDK_BACKEND=wayland
    unset DISPLAY
    WLR_BACKENDS=headless WLR_LIBINPUT_NO_DEVICES=1 WLR_RENDERER=pixman sway -c /dev/null &
    # A compositor that cannot start here says nothing about the app.
    if ! wait_for 15 test -S "$runtime/wayland-1"; then
      ok "(skipped: idle time under Wayland — headless sway did not start in this environment)"
      cleanup
      exit 0
    fi
    export WAYLAND_DISPLAY=wayland-1
    DRIVER_PORT=$((DRIVER_PORT + 2))
    start_webdriver
    act system-idle
    ok "under Wayland (sway: ext-idle-notify-v1) the tick carries the idle time, reset by input"
    cleanup
  )
  rm -rf "$runtime"
}

inside() {
  trap cleanup EXIT
  openbox &
  # The user's other work: the window that has the keyboard while Nabd is hidden.
  "$NABD_SMOKE_PYTHON" "$SMOKE/desktop_bus.py" elsewhere &
  if webdriver_installed; then start_webdriver; fi
  checks first-launch restart second-instance logged-set autostart-setting quit-from-settings
  login_launch
  checks --tray tray-menu close-to-tray login-launch
  tray_actions
  timer_nudges
  idle_nudges
  wayland_idle
  ok "all expectations met"
}

if [[ "${1:-}" == "--in-session" ]]; then
  inside
else
  outside
fi
