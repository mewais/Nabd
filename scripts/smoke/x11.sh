#!/usr/bin/env bash
# The Nabd window as the X server sees it, for the smoke test (linux-smoke.sh
# and, through it, the WebDriver acts of app-session.mjs).
#
#   x11.sh count     how many Nabd windows are shown
#   x11.sh shown     succeeds while a Nabd window is shown
#   x11.sh focused   succeeds while a Nabd window has the keyboard focus
#   x11.sh close     ask the window manager to close the window, as its close
#                    button would
#   x11.sh touch     one synthetic mouse movement: the user is at the computer
#   x11.sh elsewhere the user goes on in their other window (titled "elsewhere"):
#                    it is activated and typed in, as a person working there would

set -euo pipefail

windows() {
  xdotool search --onlyvisible --class nabd 2>/dev/null || true
}

case "${1:-}" in
  count) windows | grep -c . || true ;;
  shown) [[ -n "$(windows)" ]] ;;
  focused) windows | grep -qx "$(xdotool getwindowfocus 2>/dev/null)" ;;
  close) xdotool windowactivate --sync "$(windows | tail -n 1)" key --clearmodifiers alt+F4 ;;
  elsewhere) xdotool search --name '^elsewhere$' windowactivate --sync key --clearmodifiers shift ;;
  touch) xdotool mousemove_relative -- 1 1 mousemove_relative -- -1 -1 ;;
  *)
    echo "usage: x11.sh count|shown|focused|close|touch|elsewhere" >&2
    exit 2
    ;;
esac
