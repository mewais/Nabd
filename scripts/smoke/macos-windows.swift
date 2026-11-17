// The window server's view of some processes, for the macOS smoke test
// (screen.mjs). Compiled by macos-smoke.mjs; needs no permission: whether a
// window is on screen, its level and its size are public, only its title is not.
//
//   macos-windows windows PID...   one JSON line per window of those processes:
//                                  {"pid":…,"layer":…,"onscreen":…,"width":…,"height":…}
//   macos-windows terminate PID    ask the app to quit, as the Dock menu's Quit
//                                  does (no save first: the last resort)

import AppKit
import CoreGraphics
import Foundation

func number(_ window: [String: Any], _ key: CFString) -> Int {
    (window[key as String] as? NSNumber)?.intValue ?? 0
}

let arguments = Array(CommandLine.arguments.dropFirst())
switch arguments.first ?? "" {
case "windows":
    let pids = Set(arguments.dropFirst().compactMap { Int($0) })
    let list = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] ?? []
    for window in list where pids.contains(number(window, kCGWindowOwnerPID)) {
        let bounds = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
        let line: [String: Any] = [
            "pid": number(window, kCGWindowOwnerPID),
            "layer": number(window, kCGWindowLayer),
            "onscreen": (window[kCGWindowIsOnscreen as String] as? NSNumber)?.boolValue ?? false,
            "width": (bounds["Width"] as? NSNumber)?.intValue ?? 0,
            "height": (bounds["Height"] as? NSNumber)?.intValue ?? 0,
        ]
        if let json = try? JSONSerialization.data(withJSONObject: line, options: [.sortedKeys]) {
            print(String(decoding: json, as: UTF8.self))
        }
    }
case "terminate":
    guard arguments.count == 2, let pid = Int32(arguments[1]),
          let app = NSRunningApplication(processIdentifier: pid)
    else {
        FileHandle.standardError.write(Data("no app with that process id\n".utf8))
        exit(1)
    }
    exit(app.terminate() ? 0 : 1)
default:
    FileHandle.standardError.write(Data("usage: macos-windows windows PID... | terminate PID\n".utf8))
    exit(2)
}
