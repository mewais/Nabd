# shellcheck shell=bash
# Shell helpers of the Linux smoke test, sourced by linux-smoke.sh inside its
# throw-away session: reporting, waiting, the app's processes and window, the
# fake desktop services, WebDriver, and the shared Node checks and data
# helpers (checks.mjs, app.mjs).
#
# Expects SANDBOX (the session's temporary directory), SMOKE (this directory)
# and what linux-smoke.sh derives from them: BINARY, NOTIFICATIONS, DRIVER_PORT
# (and NABD_SMOKE_CLOCK, for linux-desktop.mjs).

# Results go to $SANDBOX/results, which linux-smoke.sh shows as they come.
# Stdout and stderr are the session's chatter (D-Bus, WebKit, the window
# manager, the drivers): it is kept in a log and shown only when an expectation
# fails. A failure is written to both, so the log shows where it happened.
export NABD_SMOKE_RESULTS="${SANDBOX:-}/results"

fail() {
  echo "FAIL $*" >>"$NABD_SMOKE_RESULTS"
  echo "FAIL $*" >&2
  exit 1
}

ok() {
  echo "ok   $*" >>"$NABD_SMOKE_RESULTS"
}

# wait_for SECONDS COMMAND...: poll until COMMAND succeeds; false if it never does.
wait_for() {
  local deadline=$((SECONDS + $1))
  shift
  until "$@" >/dev/null 2>&1; do
    ((SECONDS < deadline)) || return 1
    sleep 0.25
  done
}

# expect DESCRIPTION ACTUAL EXPECTED
expect() {
  [[ "$2" == "$3" ]] || fail "$1: expected '$3', got '$2'"
}

# ------------------------------------------------- shared checks and data ---

# checks [--tray] CHECK...: the cross-platform checks of checks.mjs, which
# report for themselves (and say what they found when one fails).
checks() {
  local driver=()
  [[ -z "$DRIVER_PID" ]] || driver=(--driver "http://127.0.0.1:$DRIVER_PORT")
  node "$SMOKE/linux-checks.mjs" --binary "$BINARY" "${driver[@]}" "$@" || exit 1
}

# app_data COMMAND [ARG...]: the app's database and login entry (app.mjs).
app_data() {
  node "$SMOKE/app.mjs" "$@"
}

stored() {
  app_data stored "$@"
}

# start_day SETS [SETTINGS]: today begins afresh on a plan of SETS sets of
# push-ups, with SETTINGS (JSON, every weekday a workday), and no notification
# shown yet.
start_day() {
  : >"$NOTIFICATIONS"
  app_data start-day "$@"
}

# ------------------------------------------------------------------ app ---

APP_PID=""

gone() {
  ! kill -0 "$1" 2>/dev/null
}

x11() {
  "$SMOKE/x11.sh" "$@"
}

window_hidden() {
  ! x11 shown
}

# launch_shown: start the app (in the background, as APP_PID) and wait for
# its window.
launch_shown() {
  "$BINARY" &
  APP_PID=$!
  wait_for 60 x11 shown || fail "no Nabd window appeared within 60 s"
}

# expect_exit DESCRIPTION: the app (APP_PID) ends, successfully, within 15 s.
expect_exit() {
  local status=0
  wait_for 15 gone "$APP_PID" || fail "$1 did not end the app"
  wait "$APP_PID" || status=$?
  expect "exit status after $1" "$status" 0
}

# -------------------------------------------------------------- desktop ---

# desktop_services: a StatusNotifier watcher with a host (a tray) and a
# notification service join the session, as a desktop's panel would bring them.
desktop_services() {
  "$NABD_SMOKE_PYTHON" "$SMOKE/desktop_bus.py" serve --tray --notifications "$NOTIFICATIONS" &
  wait_for 10 tray items || fail "the fake tray host did not come up"
}

# tray COMMAND [ARG]: the tray as its host sees it (see desktop_bus.py).
tray() {
  "$NABD_SMOKE_PYTHON" "$SMOKE/desktop_bus.py" "tray-$1" "${@:2}"
}

tray_menu_has() {
  tray menu | grep -qxF "$1"
}

tray_item_registered() {
  [[ -n "$(tray items)" ]]
}

# fake_clock_at HH:MM: the app's wall clock (for launches through
# $FAKETIME_BINARY) reads HH:MM today from now on, and runs at the real pace
# (clock in linux-desktop.mjs, the one writer of its offset file).
fake_clock_at() {
  node "$SMOKE/linux-desktop.mjs" clock-at "$1"
}

# ------------------------------------------------------------ webdriver ---

DRIVER_PID=""

# driver_ready: tauri-driver answers, and the native driver behind it (which
# tauri-driver passes /status on to) is listening and ready for a session.
driver_ready() {
  curl --silent --fail "http://127.0.0.1:$DRIVER_PORT/status" | grep -qF '"ready":true'
}

# WebKitWebDriver: on the PATH, or where a distribution's package keeps it
# outside it; empty when it is not installed.
webkit_webdriver() {
  command -v WebKitWebDriver || find /usr/lib /usr/libexec -name WebKitWebDriver -type f 2>/dev/null | head -n 1
}

webdriver_installed() {
  command -v tauri-driver >/dev/null && [[ -n "$(webkit_webdriver)" ]]
}

# start_webdriver: tauri-driver on DRIVER_PORT, the native driver on the next
# port; the apps it starts get this shell's environment.
start_webdriver() {
  tauri-driver --port "$DRIVER_PORT" --native-port "$((DRIVER_PORT + 1))" \
    --native-driver "$(webkit_webdriver)" &
  DRIVER_PID=$!
  wait_for 15 driver_ready || fail "tauri-driver did not start on port $DRIVER_PORT"
}

# needs_webdriver WHAT: whether the WebDriver parts can run (the driver is
# started with the session when it is installed); says so when they cannot.
needs_webdriver() {
  [[ -z "$DRIVER_PID" ]] || return 0
  [[ "${NABD_SMOKE_REQUIRE_WEBDRIVER:-}" != 1 ]] || fail "tauri-driver or WebKitWebDriver is not installed"
  ok "(skipped: $1 — tauri-driver or WebKitWebDriver is not installed)"
  return 1
}

# act NAME [BINARY]: one WebDriver session with the app (see app-session.mjs),
# of BINARY (default: the app as built).
act() {
  node "$SMOKE/app-session.mjs" "$1" "http://127.0.0.1:$DRIVER_PORT" "${2:-$BINARY}" ||
    fail "the WebDriver session '$1' did not go as expected"
}

# Leave no process behind: the app (and any second copy), what the session's
# jobs started (the native driver under tauri-driver), then the jobs
# themselves: tauri-driver, the desktop services, the compositors.
cleanup() {
  local job
  pkill -f "^$BINARY" || true
  for job in $(jobs -p); do pkill -P "$job" || true; done
  # shellcheck disable=SC2046 # one PID per word is the point
  kill $(jobs -p) 2>/dev/null || true
}
