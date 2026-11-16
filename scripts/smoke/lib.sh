# Shared helpers of the Linux smoke test, sourced by linux-smoke.sh inside its
# throw-away session: reporting, waiting, the database, the app's processes,
# the window, and the fake desktop services.
#
# Expects SANDBOX (the session's temporary directory), ROOT (the repository)
# and the paths linux-smoke.sh derives from them: BINARY, DB, CLOCK,
# NOTIFICATIONS.

# Results go to $SANDBOX/results, which linux-smoke.sh shows as they come.
# Stdout and stderr are the session's chatter (D-Bus, WebKit, the window
# manager, the drivers): it is kept in a log and shown only when an expectation
# fails. A failure is written to both, so the log shows where it happened.
report() {
  echo "$*" >>"$SANDBOX/results"
}

fail() {
  report "FAIL $*"
  echo "FAIL $*" >&2
  exit 1
}

ok() {
  report "ok   $*"
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

# ------------------------------------------------------------- database ---

sql() {
  sqlite3 "$DB" "$1"
}

# stored KEY PATH: one field of a stored singleton, e.g. `stored dayState .date`.
stored() {
  sql "SELECT json_extract(value, '\$$2') FROM kv WHERE key = '$1'"
}

day_is() {
  [[ "$(stored dayState .date)" == "$1" ]]
}

# plan SETS: a floating plan of one day with SETS working sets of push-ups,
# stored the way the app stores it.
plan() {
  local sets
  sets="$(printf '{"type":"working","amount":8,"upTo":12},%.0s' $(seq "$1"))"
  echo "{\"name\":\"Smoke plan\",\"type\":\"fixed\",\"schedule\":\"floating\",\"days\":[{\"id\":\"day\",\"name\":\"Desk\",\"weekday\":null,\"exercises\":[{\"id\":\"row\",\"exId\":\"push_up__bodyweight\",\"repMode\":\"range\",\"intensity\":\"none\",\"rest\":60,\"sets\":[${sets%,}]}],\"slots\":[]}]}"
}

# start_day PLAN SETTINGS: today begins afresh, on PLAN, with SETTINGS (JSON,
# missing fields at their defaults), nothing logged, nudges not paused, and no
# notification shown yet.
start_day() {
  : >"$NOTIFICATIONS"
  sql "DELETE FROM history;
       INSERT OR REPLACE INTO kv (key, value) VALUES
         ('program', '$1'), ('settings', '$2'), ('dayLog', '[]'),
         ('dayState', '{\"date\":\"$TODAY\",\"dayId\":null,\"carried\":null,\"skipped\":[],\"extras\":[],\"paused\":false}')"
}

# ------------------------------------------------------------------ app ---

APP_PID=""

gone() {
  ! kill -0 "$1" 2>/dev/null
}

x11() {
  "$ROOT/scripts/smoke/x11.sh" "$@"
}

window_hidden() {
  ! x11 shown
}

# launch [ARG...]: start the app (in the background, as APP_PID).
launch() {
  "$BINARY" "$@" &
  APP_PID=$!
}

# launch_shown [ARG...]: start the app and wait for its window.
launch_shown() {
  launch "$@"
  wait_for 60 x11 shown || fail "no Nabd window appeared within 60 s"
}

# expect_exit DESCRIPTION: the app (APP_PID) ends, successfully, within 15 s.
expect_exit() {
  local status=0
  wait_for 15 gone "$APP_PID" || fail "$1 did not end the app"
  wait "$APP_PID" || status=$?
  expect "exit status after $1" "$status" 0
}

close_and_expect_exit() {
  x11 close
  expect_exit "closing the window (no tray host is running)"
}

# second_launch [ARG...]: launch another copy, which must hand over to the
# running one and exit at once, successfully.
second_launch() {
  local second status=0
  "$BINARY" "$@" &
  second=$!
  wait_for 15 gone "$second" || fail "a second instance kept running"
  wait "$second" || status=$?
  expect "exit status of the second instance" "$status" 0
  gone "$APP_PID" && fail "the first instance ended when a second one was launched"
  return 0
}

# -------------------------------------------------------------- desktop ---

# desktop_services: a StatusNotifier watcher with a host (a tray) and a
# notification service join the session, as a desktop's panel would bring them.
desktop_services() {
  "$NABD_SMOKE_PYTHON" "$ROOT/scripts/smoke/desktop_bus.py" serve --tray \
    --notifications "$NOTIFICATIONS" &
  wait_for 10 tray items || fail "the fake tray host did not come up"
}

# tray COMMAND [ARG]: the tray as its host sees it (see desktop_bus.py).
tray() {
  "$NABD_SMOKE_PYTHON" "$ROOT/scripts/smoke/desktop_bus.py" "tray-$1" "${@:2}"
}

tray_menu_has() {
  tray menu | grep -qxF "$1"
}

tray_item_registered() {
  [[ -n "$(tray items)" ]]
}

# fake_clock_at HH:MM: the app's wall clock (for launches through
# $FAKETIME_BINARY) reads HH:MM today from now on, and runs at the real pace.
fake_clock_at() {
  local offset=$(($(date -d "today $1" +%s) - $(date +%s)))
  ((offset < 0)) || offset="+$offset"
  echo "$offset" >"$CLOCK"
}

# ------------------------------------------------------------ webdriver ---

DRIVER_PID=""

driver_ready() {
  curl --silent --fail "http://127.0.0.1:$DRIVER_PORT/status"
}

# WebKitWebDriver: on the PATH, or where a distribution's package keeps it
# outside it; empty when it is not installed.
webkit_webdriver() {
  command -v WebKitWebDriver || find /usr/lib /usr/libexec -name WebKitWebDriver -type f 2>/dev/null | head -n 1
}

start_webdriver() {
  tauri-driver --port "$DRIVER_PORT" --native-port "$((DRIVER_PORT + 1))" \
    --native-driver "$(webkit_webdriver)" &
  DRIVER_PID=$!
  wait_for 15 driver_ready || fail "tauri-driver did not start on port $DRIVER_PORT"
}

# act NAME [BINARY]: one WebDriver session with the app (see app-session.mjs),
# of BINARY (default: the app as built).
act() {
  node "$ROOT/scripts/smoke/app-session.mjs" "$1" "http://127.0.0.1:$DRIVER_PORT" "${2:-$BINARY}" ||
    fail "the WebDriver session '$1' did not go as expected"
}

# Leave no process behind: the app (and any second copy), the native driver
# under tauri-driver, then tauri-driver itself, the desktop services and the
# window manager.
cleanup() {
  pkill -f "^$BINARY" || true
  [[ -z "$DRIVER_PID" ]] || pkill -P "$DRIVER_PID" || true
  # shellcheck disable=SC2046 # one PID per word is the point
  kill $(jobs -p) 2>/dev/null || true
}
