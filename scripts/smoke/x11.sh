#!/usr/bin/env bash
# The Nabd window as the X server sees it, for the Linux smoke test
# (linux-smoke.sh, and screen.mjs for the shared checks and the WebDriver acts).
#
#   x11.sh count     how many Nabd windows are shown
#   x11.sh shown     succeeds while a Nabd window is shown
#   x11.sh focused   succeeds while a Nabd window has the keyboard focus
#   x11.sh close     ask the window manager to close the window, as its close
#                    button would
#   x11.sh touch     one synthetic mouse movement: the user is at the computer

set -euo pipefail

windows() {
  xdotool search --onlyvisible --class nabd 2>/dev/null || true
}

# The window can be missing from the search for a moment (xdotool's search
# gives up when a window vanishes under it), and activating it can lose a race
# with the window manager (xdotool dies of an X error while no window is active
# yet), before the key is sent: then it is tried again, for five seconds at most.
close() {
  local window
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    window="$(windows | tail -n 1)"
    if [[ -n "$window" ]] &&
      xdotool windowactivate --sync "$window" key --clearmodifiers alt+F4; then
      return
    fi
    sleep 0.5
  done
  echo "x11.sh: could not close the Nabd window" >&2
  return 1
}

case "${1:-}" in
  count) windows | grep -c . || true ;;
  shown) [[ -n "$(windows)" ]] ;;
  focused) windows | grep -qx "$(xdotool getwindowfocus 2>/dev/null)" ;;
  close) close ;;
  touch) xdotool mousemove_relative -- 1 1 mousemove_relative -- -1 -1 ;;
  *)
    echo "usage: x11.sh count|shown|focused|close|touch" >&2
    exit 2
    ;;
esac
