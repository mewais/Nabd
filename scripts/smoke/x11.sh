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

# Activating the window can lose a race with the window manager (xdotool dies
# of an X error while no window is active yet), before the key is sent: then
# it is tried again, a few times at most.
close() {
  for _ in 1 2 3 4 5; do
    xdotool windowactivate --sync "$(windows | tail -n 1)" key --clearmodifiers alt+F4 && return
    sleep 0.5
  done
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
