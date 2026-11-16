#!/usr/bin/env bash
# Smoke test of the real Nabd binary on Linux: the things the browser tests
# (e2e/) cannot reach — the native shell, SQLite, and the window's life cycle.
#
#   scripts/smoke/linux-smoke.sh            (or: pnpm smoke:linux)
#
# It builds the frontend and the debug binary, then runs the binary in a
# throw-away desktop session (Xvfb + its own D-Bus session + openbox) with
# HOME and the XDG directories pointing into a temporary directory, and checks:
#
#   1. first launch    a window appears; the database is created at schema
#                      version 2; the frontend boots and stores its day state
#   2. closing         with no tray host in the session, closing the window
#                      quits the app (README: "Without a tray")
#   3. restart         a plan stored before the launch is still there, and the
#                      day that ended while the app was off is rolled over
#   4. second launch   exits at once and leaves the first instance running
#   5. logging a set   (WebDriver) a set logged in the real window lands in the
#                      history table and, like Pause, survives a restart
#
# Part 5 needs `tauri-driver` (cargo install tauri-driver --locked) and
# `WebKitWebDriver` (apt: webkit2gtk-driver); without them it is skipped, or
# fails when NABD_SMOKE_REQUIRE_WEBDRIVER=1.
#
# Environment:
#   NABD_SMOKE_BINARY             test this binary instead of building one
#   NABD_SMOKE_REQUIRE_WEBDRIVER  1 = part 5 must run
#   NABD_SMOKE_DRIVER_PORT        tauri-driver's port (default 4444; the native
#                                 driver takes the next one)
#
# Other needs: xvfb, dbus (dbus-run-session), openbox, xdotool, sqlite3, curl.
# Exits non-zero, naming the failed expectation, as soon as one fails; every
# process it started and its temporary directory are gone when it returns.

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
  (cd "$ROOT" && pnpm tauri build --debug --no-bundle) >&2
  echo "${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}/debug/nabd"
}

outside() {
  require xvfb-run dbus-run-session openbox xdotool sqlite3 curl
  local binary status=0
  binary="${NABD_SMOKE_BINARY:-$(built_binary)}"
  SANDBOX="$(mktemp -d)"
  trap 'rm -rf "$SANDBOX"' EXIT
  mkdir "$SANDBOX"/{home,data,config,cache}
  # A private copy: a rebuild while the test runs cannot swap the binary under it.
  cp "$binary" "$SANDBOX/nabd"

  env -u WAYLAND_DISPLAY \
    HOME="$SANDBOX/home" XDG_DATA_HOME="$SANDBOX/data" \
    XDG_CONFIG_HOME="$SANDBOX/config" XDG_CACHE_HOME="$SANDBOX/cache" \
    GDK_BACKEND=x11 SANDBOX="$SANDBOX" \
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
DB="${XDG_DATA_HOME:-}/$APP_ID/nabd.sqlite"
TODAY="$(date +%F)"
YESTERDAY="$(date -d yesterday +%F)"
APP_PID=""
DRIVER_PID=""

# One floating day with one set of one exercise, stored the way the app stores it.
PLAN='{"name":"Smoke plan","type":"fixed","schedule":"floating","days":[{"id":"day","name":"Desk","weekday":null,"exercises":[{"id":"row","exId":"push_up__bodyweight","repMode":"range","intensity":"none","rest":60,"sets":[{"type":"working","a":8,"b":12}]}],"slots":[]}]}'

# Results go to descriptor 3, which `outside` connects to the terminal. Stdout
# and stderr are the session's chatter (D-Bus, WebKit, the window manager, the
# drivers): it is kept in a log and shown only when an expectation fails.
fail() {
  echo "FAIL $*" >&3
  exit 1
}

ok() {
  echo "ok   $*" >&3
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

sql() {
  sqlite3 "$DB" "$1"
}

# stored KEY PATH: one field of a stored singleton, e.g. `stored dayState date`.
stored() {
  sql "SELECT json_extract(value, '\$$2') FROM kv WHERE key = '$1'"
}

# expect DESCRIPTION ACTUAL EXPECTED
expect() {
  [[ "$2" == "$3" ]] || fail "$1: expected '$3', got '$2'"
}

windows() {
  xdotool search --onlyvisible --class nabd 2>/dev/null
}

window_shown() {
  [[ -n "$(windows)" ]]
}

gone() {
  ! kill -0 "$1" 2>/dev/null
}

launch() {
  "$BINARY" &
  APP_PID=$!
  wait_for 60 window_shown || fail "no Nabd window appeared within 60 s"
}

# Ask the window manager to close the window, as its close button would.
close_window() {
  xdotool windowactivate --sync "$(windows | tail -n 1)" key --clearmodifiers alt+F4
}

close_and_expect_exit() {
  local status=0
  close_window
  wait_for 15 gone "$APP_PID" || fail "closing the window did not end the app (no tray host is running)"
  wait "$APP_PID" || status=$?
  expect "exit status after closing the window" "$status" 0
}

day_is() {
  [[ "$(stored dayState .date)" == "$1" ]]
}

first_launch() {
  launch
  ok "a window appears"
  wait_for 30 test -s "$DB" || fail "no database at $DB"
  expect "database schema version" "$(sql "SELECT value FROM app_meta WHERE key = 'version'")" 2
  ok "the database is created at schema version 2"
  wait_for 30 day_is "$TODAY" || fail "the frontend did not store today's day state"
  ok "the frontend booted and stored its day state"
  close_and_expect_exit
  ok "without a tray host, closing the window quits the app"
}

restart_keeps_data() {
  sql "INSERT OR REPLACE INTO kv (key, value) VALUES
         ('program', '$PLAN'),
         ('dayState', '{\"date\":\"$YESTERDAY\",\"dayId\":null,\"skipped\":[],\"extras\":[],\"paused\":true}')"
  launch
  wait_for 30 day_is "$TODAY" || fail "yesterday's day was not rolled over at launch"
  expect "stored plan after a restart" "$(sql "SELECT value FROM kv WHERE key = 'program'")" "$PLAN"
  expect "schema version after a restart" "$(sql "SELECT value FROM app_meta WHERE key = 'version'")" 2
  expect "yesterday's record: date" "$(stored dayLog '[0].date')" "$YESTERDAY"
  expect "yesterday's record: planned sets" "$(stored dayLog '[0].planned')" 1
  expect "yesterday's record: done sets" "$(stored dayLog '[0].done')" 0
  expect "pause on the new day" "$(stored dayState .paused)" 0
  ok "a restart keeps the stored plan and rolls yesterday over in the database"
}

second_instance() {
  local first="$APP_PID" second status=0
  "$BINARY" &
  second=$!
  wait_for 15 gone "$second" || fail "a second instance kept running"
  wait "$second" || status=$?
  expect "exit status of the second instance" "$status" 0
  gone "$first" && fail "the first instance ended when a second one was launched"
  expect "number of windows" "$(windows | wc -l)" 1
  ok "a second launch exits and leaves the first instance and its one window"
  close_and_expect_exit
}

webdriver_available() {
  command -v tauri-driver >/dev/null && command -v WebKitWebDriver >/dev/null
}

driver_ready() {
  curl --silent --fail "http://127.0.0.1:$DRIVER_PORT/status"
}

# act NAME: one WebDriver session with the app (see app-session.mjs).
act() {
  node "$ROOT/scripts/smoke/app-session.mjs" "$1" "http://127.0.0.1:$DRIVER_PORT" "$BINARY" ||
    fail "the WebDriver session '$1' did not go as expected"
}

logged_set_survives() {
  if ! webdriver_available; then
    [[ "${NABD_SMOKE_REQUIRE_WEBDRIVER:-}" != 1 ]] || fail "tauri-driver or WebKitWebDriver is not installed"
    ok "(skipped: logging a set through WebDriver — tauri-driver or WebKitWebDriver is not installed)"
    return
  fi
  tauri-driver --port "$DRIVER_PORT" --native-port "$((DRIVER_PORT + 1))" &
  DRIVER_PID=$!
  wait_for 15 driver_ready || fail "tauri-driver did not start on port $DRIVER_PORT"

  act log-a-set
  local set="SELECT ex_id || ' ' || date || ' ' || trigger || ' ' || plan_item_id FROM history"
  expect "the history table" "$(sql "$set")" "push_up__bodyweight $TODAY manual row"
  expect "pause in the database" "$(stored dayState .paused)" 1
  ok "a set logged in the window is a row of the history table; Pause is stored"

  act after-restart
  expect "the history table after a restart" "$(sql "$set")" "push_up__bodyweight $TODAY manual row"
  ok "after a restart the window still counts the set and nudges are still paused"
}

# Leave no process behind: the app (and any second copy), the native driver
# under tauri-driver, then tauri-driver itself and the window manager.
cleanup() {
  pkill -f "^$BINARY" || true
  [[ -z "$DRIVER_PID" ]] || pkill -P "$DRIVER_PID" || true
  # shellcheck disable=SC2046 # one PID per word is the point
  kill $(jobs -p) 2>/dev/null || true
}

inside() {
  trap cleanup EXIT
  openbox &
  first_launch
  restart_keeps_data
  second_instance
  logged_set_survives
  ok "all expectations met"
}

if [[ "${1:-}" == "--in-session" ]]; then
  inside
else
  outside
fi
