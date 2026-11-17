# Nabḍ · نبض — Desk Workout Tracker & Planner

A **desktop** app for people who work from home next to a home gym. Instead of one gym
session, the workout is spread across the workday: one set every so often, between
meetings and builds. Nabḍ sits in the tray, notices a good moment, and tells you to go
do the next set. You log it; it works out what to suggest next time.

Built with **Tauri 2**: a small Rust core (SQLite, tray, notifications, idle time,
autostart) and a React/TypeScript frontend that holds all the domain logic.

## How it works

- **The plan** (Plan screen) is either _fixed_ — specific exercises per day — or
  _cycled_ — each day targets muscles, and each muscle rotates through a pool of
  exercises, moving on to the next one each time the day comes round. Days are pinned
  to weekdays (at most one per weekday, so seven), or _floating_: Day 1, 2, 3 … in
  order, moving on once a day owes nothing more — completed, skipped, or empty. An
  unfinished floating day comes back the next day, with only what is still owed: the
  sets already logged for each exercise on the earlier days count as done (an exercise
  that is whole shows as done and is not nudged for, and a warm-up done yesterday means
  today starts at the first working set), and the plan moves on when the rest is done.
  What was done is counted by kind of set (warm-ups, working sets, drop sets), so an
  edit afterwards — a warm-up deleted, a set's kind changed — never turns a working set
  that was done into a warm-up; and it counts for the exercise it was done on, so a pool
  that has since moved on from that exercise owes its new one in full. The same count
  holds within a day: a prescribed warm-up is owed like any other set, so an exercise is
  whole only once each kind it prescribes is done, and extra sets of one kind never stand
  in for another. Such a day is one
  visit, and one session, however many calendar days it takes: its sets are compared
  with the session before the visit, not with each other (see Suggestions), and the
  logger says which day it continues ("Continuing Monday's Push"). A set logged while a
  visit continues belongs to its session, and any other set — on a weekday plan, or on a
  floating day begun that day — to its own date's, whatever else that day logged or a
  switch of schedule left behind; an edit that leaves the plan on the visit's day keeps
  the visit, even when it takes away all the visit carried. A skip is for its
  calendar day only, so a skipped exercise is owed again; the one exception is that a
  day owing nothing moves on. Each calendar day puts on record what it owed and what it
  did, so a day that came back for two sets and did them is 100%; a day it merely waited
  on is not a missed day, so only days with a set (or that the plan moved on from) count
  toward completion — the day the plan is on counts from the start, so Progress shows
  what Today shows. A weekday plan has no such memory: its days belong to the calendar
  (switching to weekdays and back on the same day finds the unfinished day as it was;
  the weekday plan's next day forgets it). A few rules hold whatever is edited, stored
  or imported:
  - whether a set is counted in reps or in seconds is the exercise's doing, not a
    choice: a rep-counted exercise is prescribed as a range or a fixed number, a hold in
    seconds. A cycled pool shares one prescription, so it holds one kind — the kind of
    its first exercise — and the library only offers that kind for it;
  - a pool is tracked by exercise, not by position, so editing it never skips or
    repeats one — and on a floating plan a pool moves on only when its day does, so a
    day that comes back is on the same exercises;
  - a superset stays together: an exercise moved past it steps over the whole group, a
    member moves within it, and a member moved out past its edge is unlinked. The
    supersets of a day are lettered A, B, C … (A1/A2, B1/B2);
  - a weekday plan has one day per weekday: a stored or imported one with a second day on
    a weekday (or a day on none) moves that day to the first free weekday after it, and
    one with more than seven days runs floating, every day kept;
  - switching between weekdays and floating keeps today on the day it is on: going
    floating starts on today's weekday's day (the first day, on a rest day); going
    weekdays pins the current day to today and the days after it to the weekdays that
    follow;
  - a set prescribed at an RPE is at RPE 5–10, at a %1RM at 40–100% — what the planner's
    steppers allow, and what a stored or imported value outside them is held to;
  - deleting a day or a custom exercise, and importing over what is stored, ask first;
  - the planner opens on today's day — on a rest day, on the plan's first day (the
    earliest in the week, Monday first, for a weekday plan). Where the window is too
    narrow for the day being edited and the coverage rail side by side (near its
    smallest, 980 × 640), the rail goes under the editor.
- **Today** is derived, never stored: the plan for the day, plus the sets logged today.
  Edit the plan and Today changes immediately; restart the app and nothing is lost. A
  set whose exercise has since left the plan (or the library) is still listed and
  counted, and a logger open on an exercise that leaves the queue moves on to the next
  one (or closes) rather than linger.
- **Nudges** follow four rules:
  1. never outside the workday or on a day off (Settings → Workday: the hours, and the
     weekdays worked — Monday to Friday unless changed, whatever the schedule), while
     paused, or with nothing left. The top bar says when nudging resumes ("Quiet until
     Mon 09:00"). A day off still shows its plan and takes sets, but owes nothing until a
     set is logged on it: an idle one neither moves a floating plan on nor counts toward
     completion. The streak counts workdays only: a workday with a set adds to it, a
     workday without one ends it, and days off do neither, so a Monday-to-Friday streak
     carries over the weekend;
  2. the timer nudges _interval_ minutes after your last set (before the first one: after
     the workday started, the app was launched, or the plan got work — whichever is latest);
  3. an idle moment (no keyboard or mouse for the _idle moment_ setting) nudges earlier —
     but never sooner than the _minimum gap_ after the moment the timer counts from (your
     last set, or before the first one, the start of the workday, the launch or the plan
     getting work), so the start of the day is never an idle moment;
  4. Snooze silences both for five minutes.

  A nudge that has fired stays up until it is answered — Start, Snooze, a logged set or
  Pause — even if you touch the mouse in the meantime, and the sets you then log are
  recorded as prompted by it. It shows as a toast in the window and, when the window is
  not in front, as a desktop notification (a window hidden in the tray is also brought
  back, unfocused). Left unanswered, the notification is repeated once per _interval_
  for as long as the window stays out of focus; the toast stays the one toast. Opening
  the logger answers it; closing the logger without logging keeps it quiet for the
  length of a snooze.

- **A nudge is an invitation, not a limit.** The logger lists all of today's exercises;
  log one set or as many as you have time for, in any order. Supersets alternate, rest
  between back-to-back sets is counted down, any exercise can be skipped for the day
  (and restored), and anything not in the plan can be logged as an extra ("log
  something else" on an exercise that is already in today's queue goes to that
  exercise). A set beyond an exercise's prescription keeps the form on that exercise.
  Reps and weight can be stepped (− / +, or ↑ / ↓ in the field: one rep, five seconds,
  one weight increment) or typed — a field can be emptied and retyped, and goes back to
  its last number if left empty — and Enter logs the set. A number typed finer than its
  field holds (whole reps, a weight to two decimals) is taken as its rounded value, and
  the same single Enter logs it. A weight reads exactly as it
  was entered, to two decimals, so quarter steps read exactly; shown in the other unit
  it is a conversion, rounded to one decimal (20 kg is "44.1 lb"). The form's own
  field always holds two decimals, so it can be stepped by the finest increment.
- **Nothing logged is lost quietly.** A logged set shows at once, marked "not saved
  yet" until the database has it, and the logger's count of the day says how many are
  not ("3 sets logged today, 1 not saved yet"). A set the database would not take stays
  marked, and is retried on every clock beat, after any save that works, and before an
  export or quitting — from Settings, the tray menu, Cmd+Q, or by
  closing a window that has no tray to hide in, alike (each of those is carried out by
  the window, which saves first; if the window cannot answer within three seconds the
  app exits anyway). What the app is never told of cannot wait for it: the session
  ending under it (logging off, shutting down), the Dock menu's Quit on a Mac, or the
  process being killed — a set not saved yet by then is lost. A set counts toward the
  day that is open when it is logged, so it stays in today's list even if the clock is
  set back meanwhile. Before an import replaces anything, a backup export
  (`nabd-backup-before-import-…json`) is written next to your exports; an export says
  so when it had to leave out sets that are not saved yet, or that could not be read.
  Stored settings are read field by field, so one bad value only resets itself.
- **Older data is brought along.** Whatever an earlier version stored, or exported, is
  upgraded as it is read (and written back in today's shape): the field names of
  prescribed sets (export format 3), the old "translucent" theme, plans and rotations
  that pointed at positions instead of ids, and exercises the catalog has since retired
  — a single-arm variant of two-handed equipment becomes the two-handed exercise, and
  an unfinished day's carried sets, once counts of its first prescribed sets, become
  the kinds of those sets, of the exercise each was on (export format 5). What came
  later (the workdays, export format 4; a set's session and your body weight, format 5)
  is simply missing from older data and takes its default: Monday to Friday, each set
  the session of its own date, body weight not given. The database follows suit
  (schema version 3 gives every stored set the session of its date).
- **Suggestions** use double progression against the same set of your previous session
  (a session is one visit to a program day: a calendar day's sets, or all the sets of
  an unfinished floating day that came back, whichever days they were logged on):
  inside your rep range → one more rep (or, alternatively, the same reps with more
  load); at the top → more load, back at the bottom of the range; below it → hold the
  load; below it two sessions running → back off one step. "More load" is your own
  weight increment (Settings → Training; 2.5 kg or 5 lb unless you choose your own,
  which a change of unit leaves alone), so 8 × 25 lb suggests 9 × 25 lb or 8 × 27.5 lb.
  Where a set is prescribed at a %1RM or an RPE and the exercise has an estimated 1RM
  (Epley, from its latest session, reading at most 15 reps of a set), the load follows the prescription instead, rounded
  to your increment, for the bottom of the rep range: a %1RM is that share of the
  estimate ("70% of your estimated max (86 kg)"), an RPE is 10 − RPE reps in reserve,
  the load at which the prescribed reps plus those in reserve make up the estimate
  ("RPE 8 ≈ 2 reps in reserve"). Plain double progression stays the alternative. Until
  there is history — or, with history, until a session moved a load — the advice is
  plain double progression and says what the intensity is waiting for; a hold and
  bodyweight reps ignore it. A weighted or assisted bodyweight exercise moves your body
  weight with its load added (or its assistance taken off), so its estimate, and the
  load an intensity asks of it, count your body weight (Settings → Training → Body
  weight, in your unit, empty until you give it); without it such an exercise ignores
  the intensity and says to set your body weight in Settings to use it. A bodyweight
  exercise whose load would round to nothing stays reps-first. Every load suggested is
  one the form takes: never above the most a set can record (1000 kg), and never less
  than one increment for an exercise that needs a bar or a dumbbell — a deload there
  stops at one increment, and the form's − does too; a load typed outside those bounds
  is not taken: Enter or leaving the field brings back the last load it took, and that
  Enter does not log the set.
  A bodyweight exercise with nothing added is plain reps — "12 reps", then "8 + 2.5 kg
  or 13 reps" at the top of the range — and only an exercise that needs a bar or a
  dumbbell asks you to pick a starting weight. Warm-ups are left out of progression,
  volume and trends; the form remembers your last warm-up separately, and starts each
  kind of set (warm-up, working, drop) from its own numbers. A first warm-up, with none
  on record, starts from half the last working load, rounded to your weight increment,
  for the reps the plan asks. An exercise's trend has one unit: an estimated 1RM (of the
  load alone) once it has ever been loaded, reps or seconds until then.
- **Closing the window hides it**; the app lives in the tray, on a Mac the menu bar (Start next set, Pause
  nudges, Open, Quit). Where the desktop shows no tray icons (stock GNOME without the
  AppIndicator extension) the app is an ordinary window: closing it quits (once the
  window has saved what is pending), and "Start minimized" is switched off in
  Settings, which says why. Settings → Quit Nabd always exits.
- **The keyboard reaches everything.** A row of options (theme, unit, plan type…) is
  one tab stop, chosen with the arrow keys, Home and End; a drop-down list opens on ↓,
  moves with the arrows, Home, End or an option's first letter, picks with Enter and
  closes with Escape. Every − and + says what it steps ("Decrease reps"), and every
  button of Today's queue which exercise it acts on ("Skip Barbell Bench Press").

## Prerequisites

Node ≥ 20 with pnpm (the version in `package.json`'s `packageManager`; `corepack enable`
provides it) and stable Rust (`rustup`), plus per platform:

- **Linux** (Debian/Ubuntu names):

  ```bash
  sudo apt install build-essential curl wget file pkg-config libssl-dev \
    libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev
  ```

  `rpm` as well if you build the `.rpm` bundle. At run time the app needs
  `libwebkit2gtk-4.1-0` (WebKitGTK 2.40 or later), `libgtk-3-0` and
  `libayatana-appindicator3-1`; the `.deb`/`.rpm` bundles declare them.

- **Windows 10/11**: the Microsoft C++ Build Tools ("Desktop development with C++"
  workload) and the WebView2 runtime, version 111 or later — part of Windows 11,
  installed by the Nabd installer on Windows 10 if it is missing, and kept up to date
  by Windows.

- **macOS 11 (Big Sur) or later**, with Safari 16.2 or later: the Xcode command line
  tools (`xcode-select --install`), and both Rust targets for the universal binary CI
  builds (`rustup target add aarch64-apple-darwin x86_64-apple-darwin`, then
  `pnpm tauri build --target universal-apple-darwin`). The WebView is the system's
  WKWebView: built into macOS 13.1 and later at the version the app needs, and brought
  up to it on macOS 11 and 12 by Safari's own updates (Software Update).

The minimum web views are what the UI needs: every tint and shade is mixed with
`color-mix()` in OKLCH, and the app uses `structuredClone`, `crypto.randomUUID` and
`Array.prototype.at` — all there from Safari 16.2, Chromium 111 (WebView2) and
WebKitGTK 2.40. There are no fallbacks for older engines; the bundles declare the
macOS minimum (`bundle.macOS.minimumSystemVersion`), and a supported Linux distribution
gets WebKitGTK 2.40 or later through its updates (Ubuntu 22.04, Debian 12 and Fedora 38
on).

## Platform support

|                 | Windows 10/11                                                                                                                                                                                                                                                                                                     | macOS 11+                                                                                                                                                                                                            | Linux, X11                                                                                                                               | Linux, Wayland                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Web view        | WebView2 111+                                                                                                                                                                                                                                                                                                     | WKWebView of Safari 16.2+ (built in from macOS 13.1)                                                                                                                                                                 | WebKitGTK 2.40+                                                                                                                          | the same                                                                                                                 |
| Tray            | always                                                                                                                                                                                                                                                                                                            | always: a menu-bar item (monochrome template icon); a click opens its menu                                                                                                                                           | needs a StatusNotifier host: KDE, or GNOME with the AppIndicator extension                                                               | the same                                                                                                                 |
| Without a tray  | —                                                                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                                                    | a plain window: closing it quits, once it has saved                                                                                      | the same                                                                                                                 |
| Window          | closing hides it                                                                                                                                                                                                                                                                                                  | closing hides it; the Dock icon brings it back                                                                                                                                                                       | closing hides it (with a tray)                                                                                                           | the same                                                                                                                 |
| Quit            | tray Quit, Settings (both save first)                                                                                                                                                                                                                                                                             | tray Quit, Settings and Cmd+Q (all save first); the Dock menu's Quit does not                                                                                                                                        | tray Quit, Settings, closing the tray-less window (all save first)                                                                       | the same                                                                                                                 |
| Idle time       | system-wide                                                                                                                                                                                                                                                                                                       | system-wide (CoreGraphics event source)                                                                                                                                                                              | GNOME (Mutter), else the X screen-saver extension, else KDE's screen saver                                                               | GNOME (Mutter), else `ext-idle-notify-v1` (KDE, Sway, Hyprland…), else KDE's                                             |
| Glass           | Mica on Windows 11, blur on Windows 10                                                                                                                                                                                                                                                                            | vibrancy (under-window material, follows light/dark)                                                                                                                                                                 | not offered: no portable blur, so the window stays opaque                                                                                | the same                                                                                                                 |
| Open at startup | registry `Run` entry                                                                                                                                                                                                                                                                                              | a LaunchAgent in `~/Library/LaunchAgents/`                                                                                                                                                                           | an entry in `~/.config/autostart/`                                                                                                       | the same                                                                                                                 |
| Notifications   | toast                                                                                                                                                                                                                                                                                                             | Notification Center                                                                                                                                                                                                  | the desktop's notification service                                                                                                       | the same                                                                                                                 |
| Verified        | in CI: build, tests, bundles, and the smoke test of the real binary on the runner's desktop — window, SQLite in `%APPDATA%`, the `Run` entry, closing to the tray, login launch hidden, single instance, a set logged, Settings → Quit, idle time (WebDriver); also cross-built from Linux (`pnpm check:windows`) | in CI: build, tests, universal bundle, and the smoke test of the real `.app` — window, SQLite, the LaunchAgent, login launch hidden, single instance, closing to the menu bar, the menu-bar item's menu and its Quit | in CI, plus the smoke test of the real binary: window, SQLite, tray and its menu, notifications, idle time, login entry, single instance | the smoke test's idle time under a headless sway (`ext-idle-notify-v1`); tray, notifications and the rest only as on X11 |

Where the OS cannot report idle time, "idle" means no keyboard or mouse activity inside
the Nabḍ window, and Settings says so (also when the desktop's idle service is lost, or
comes back, while the app is running). A login launch always starts in the tray (if there
is one); "Start minimized" does the same for launches by hand. Windows, macOS and Linux
are the only targets: building for anything else stops with a compile error that says so.

macOS builds are one universal binary, for Apple silicon and Intel Macs alike, unsigned
and not notarized (CI makes the `.app` and `.dmg` without a signing identity), so
Gatekeeper asks for a right-click → Open the first time. On every platform, what ends
the app without telling it (logging off or shutting down, the Dock menu's Quit, a killed
process) leaves no time to save a set that is still waiting to be.

## Quick start

```bash
pnpm install
pnpm tauri dev          # the desktop app (needs a desktop session + webkit2gtk-4.1 on Linux)
pnpm dev                # just the UI in a browser, on an in-memory sample plan (http://localhost:1420)
pnpm tauri build        # production bundle
```

## Checks

```bash
pnpm test               # TypeScript suites (Vitest); one package: pnpm --filter @nabd/nudge test
pnpm test:rust          # Rust crates
pnpm typecheck          # packages and tests, one strict tsconfig
pnpm lint               # ESLint + Prettier
pnpm lint:rust          # rustfmt + clippy, over the whole Cargo workspace
pnpm check              # all of the above
pnpm check:windows      # from Linux: clippy, a full build and the Rust crates' tests for Windows
pnpm lint:sh            # shellcheck over the smoke test's shell scripts
```

`pnpm check:windows` cross-compiles for `x86_64-pc-windows-gnu` (`rustup target add
x86_64-pc-windows-gnu`, apt `mingw-w64`) and runs the crates' tests under Wine (apt `wine`):
clippy with `-D warnings`, `nabd.exe` built in full, and the persistence, native and ipc
suites. Under Wine the built `nabd.exe` gets as far as opening its database (schema version
3, in `%APPDATA%\com.mewais.nabd`, given a display: `xvfb-run`) and then waits for a WebView2
runtime Wine does not have; what is on screen is left to the Windows smoke test below.

Besides the usual rules, ESLint enforces four things about this code base
(`eslint.config.js`, `scripts/eslint/`, with their own tests in `tests/scripts/`):

- the dependency direction between packages described under [Layout](#layout), and
  that a package — or a test — reaches another only through its entry point
  `@nabd/<name>`, never a file inside it, by alias or by relative path (a plain-data
  JSON file the package publishes in its `exports` aside); the end-to-end
  specs may use only what does not draw (`scripts/eslint/layers.js`);
- one import style: types come in their own `import type { … }` statement, and a module
  is imported once per kind;
- that styling stays in the design system (`scripts/eslint/styling.js`). Outside it
  there is no `style` attribute (nor one passed in a spread); no colour spelled out
  (`var(--…)`, `color-mix(…)`, hex, `rgb(…)`, `oklch(…)`, or a word such as `"red"` for a
  colour property or attribute); no CSS length, track list or function in a string
  (`"8px"`, `"1fr"`, `"minmax(…)"`); no number or string for a size, spacing, radius,
  weight or position of a style property, however its key is written; no number for a
  sizing attribute (`size={14}`, `width={540}`); and no raw `<button>`, `<input>`,
  `<select>` or `<textarea>`, nor any other element made clickable with `onClick`.
- that a component writes no words of its own (`scripts/eslint/wording.js`): in the
  packages that draw (the design system, the body map, the screens) no JSX text, and no
  string given to a prop that labels (`title`, `ariaLabel`, `placeholder`, `hint`…), has a
  letter in it — the words come from the package's `wording.ts` or its view-model.

A genuine one-off is disabled on its line, with the reason.

The app's version is written in `package.json` (which `tauri.conf.json` and the UI
read) and in `src-tauri/Cargo.toml`; `src-tauri/build.rs` refuses to build when the
two differ. The same build script takes the window's title from the page's `<title>`,
and the window's background before the page has painted from the design system's
`prepaint.json` — the dark theme's background, which the theme, the page's own prepaint
(Vite, through `@nabd/design-system/prepaint.json`) and the build script all read.

## End-to-end tests

```bash
pnpm exec playwright install chromium   # once: the browser Playwright drives
pnpm e2e                                # build, serve with `vite preview`, run every spec headless
pnpm e2e specs/03-suggestions.spec.ts   # one spec; any `playwright test` argument can follow
```

`e2e/` holds Playwright specs that use the whole UI the way a person does — build a plan
in the planner, get nudged, log sets, change settings, read Progress — in a browser, on
the in-memory backend of `pnpm dev`. Two things make them deterministic:

- **the clock** is Playwright's fake one, installed before the page loads and frozen:
  time passes only when a spec says so, either with nobody at the keyboard
  (`app.idleFor`) or with the mouse moving in the window (`app.busyFor`) — in a browser
  the app takes its idle time from activity inside the page;
- **the data** a spec starts from is handed to the demo backend through
  `window.__NABD_E2E_SNAPSHOT__` (`packages/app/src/demo.ts`), the one seam the tests
  have. It is read only where the demo backend is built, which the desktop app never does.

`e2e/support/` has the fixture (`app`), one page object per screen and modal (each a
`ScreenObject` or a `DialogObject`, `pages/region.ts`), and the plans and history the
specs start from — built with the unit suites' fixture kit (`tests/support/builders.ts`
and the catalog ids of `tests/support/exercises.ts`), so an exercise or a prescription
means the same in both. `e2e/base.config.ts` is what the specs and the screenshot capture
share: the browser, and the served build it drives. The browser runs in a non-UTC time
zone so "today" is tested as the user's calendar day. Page objects find things the way a person does — by
role and name — never by style. A spec marked `test.fail` documents designed behaviour
the app does not have yet: it starts failing the day the app is fixed, and the mark comes
off. No spec is marked at present.

## Smoke test

```bash
# Linux
sudo apt install xvfb dbus openbox xdotool curl libfaketime \
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
`app-session.mjs`, over the small client in `webdriver.mjs` and the `tauri-driver` process of
`driver.mjs` (on Linux, a job of the session `linux-smoke.sh` sets up); each act starts once the
driver's `/status` says it is ready for a session, and ends once its app and window are gone. Each entry script only sets its platform up and picks the checks (on Linux,
`linux-smoke.sh` runs them through `linux-checks.mjs`). This list is the one description of
the checks:

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
effect's look (Mica, blur, vibrancy); a set logged, a setting changed or idle time read on
macOS; the focus a second launch gives on Windows and macOS; the tray, notifications and idle
time of a real GNOME or KDE session (Mutter's idle monitor, KDE's screen saver), and the
Wayland tray and notifications; installing from the bundles (`.msi`, NSIS, `.dmg`, `.deb`,
`.rpm`), and Gatekeeper.

`pnpm visual` (`e2e/visual/`) photographs every screen, modal and overlay state in both
themes, on the e2e fixture and its fake clock, into `e2e/visual/shots/` (`OUT=<dir>` for
elsewhere, `URL=<app>` for an app already being served) — for comparing two builds by
eye; `pnpm e2e` does not run it. The same capture, as its own project
(`pnpm exec playwright test --config e2e/visual --project icon`), renders the app icon's
source image (`src-tauri/icons/source.png`) from the in-app logo. To regenerate the icons
after a theme or logo change:

```bash
pnpm exec playwright test --config e2e/visual --project icon
pnpm tauri icon src-tauri/icons/source.png -o <scratch dir>
# keep only what tauri.conf.json lists (32x32.png, 128x128.png, 128x128@2x.png, icon.icns,
# icon.ico): copy those into src-tauri/icons/ and drop the mobile sets. tray-template.png is
# drawn by hand and stays.
```

## Layout

Code lives in `packages/` (TypeScript, one `@nabd/<name>` package per directory) and
`src-tauri/` (Rust); tests live apart from the code, under `tests/<package>/` and
`tests/rust/<crate>/`. The `paths` block of `tsconfig.json` is the single map of package
locations; `workspace.config.ts` turns it into the aliases Vite and Vitest resolve
through, and `vitest.workspace.ts` makes one test project of every package that has a
`tests/<package>/` directory (in a DOM if the package depends on React, in Node
otherwise).

```
packages/
  domain          the shared vocabulary: the persisted model (types + zod schemas) with
                  its name tables and rules, settings, what a machine can do, and the
                  small helpers everything is written with (local dates, numbers,
                  lists, JSON, text)
  view            what the user is looking at, as types only: screen, map view, tab,
                  notice, the library's state — shared by the store and the screens
  dataset         ExerciseLibrary: movement catalog × equipment × laterality
  coverage        MuscleVolume: sets per muscle, from the plan or from history
  scheduling      TodayPlan / PlanItem (today's queue), DayLedger (what a day owed and
                  did) and day rollover
  progression     ProgressionAdvisor, ExerciseHistory, ExerciseProgress (trends, in kg)
  session         LogSession (the set being entered), Coach, wording
  nudge           NudgePolicy: when to say "time to move"
  analytics       TrainingStats: streaks, completion, time of day, triggers
  program-editor  ProgramEditor and PrescriptionEditor: every planner mutation,
                  immutably, and the rules a program obeys however it was edited,
                  stored or imported
  serialization   upgrades whatever an older version stored or exported to today's
                  shape, and validates an import file
  ipc-client      the typed boundary to the Rust backend, and an in-memory stand-in
  store           Zustand store, one file per slice: state, actions, memoized selectors,
                  and what holds after every change (settle.ts)
  design-system   theme, tokens (colours and tints, spacing, sizes and named widths,
                  type roles and weights, radii, shadows, layers) and every
                  presentational primitive: layout (Row, Stack, Grid, WithSide,
                  Divider…), Text, Card, ButtonBase under every button and
                  InputBase under every field; one prop vocabulary for all of them
                  (the CONVENTIONS at the top of its index.ts); the words its
                  primitives say, and those the screens share (wording.ts); the
                  window's pre-paint colour (prepaint.json)
  bodymap         the anatomical SVG map (its vendored drawing in src/drawing/), the
                  per-muscle meter, and the muscles as the options of a picker
  shell           the app chrome: sidebar, top bar, notice banner
  today           the Today screen
  planner         the Plan screen
  progress        the Progress screen
  modals          set logger, nudge toast, exercise library, settings, history chart,
                  and the confirmation asked before anything destructive
  app             React wiring (containers, app loop) + the browser demo backend
src-tauri/
  crates/persistence   Store: SQLite, the singletons and the set history, migrations
  crates/native        the pure decisions behind native features (tray model,
                       notifications, capabilities, launch/close, idle backends)
  crates/ipc           DataCommands: what the frontend can ask of the stored data
  src/                 the Tauri binary: lib, main, commands/ (data, native), db, error,
                       tray, app_menu (the macOS menu bar's app menu: Cmd+Q), window,
                       clock, glass, autostart, notifications, export, platform/ (what
                       differs between the desktops: linux, macos, windows) and idle/
                       (one backend per platform API: dbus, wayland, x11 under linux;
                       macos; windows)
  build.rs             the version check, the window title and its background (see Checks)
tests/                 tests/<package>/, tests/rust/<crate>/, tests/scripts/ (the local
                       ESLint rules), and the shared kits: tests/support/ (the fixture
                       kit — builders, exercises, programs — and world, dom) and
                       tests/rust/common/
e2e/                   Playwright specs of the whole UI, with their page objects and
                       shared config, and the screenshot capture (visual/: the screens,
                       and the app icon's source image)
scripts/               the Vitest setup file, the local ESLint rules and the smoke
                       tests (smoke/: one entry per platform, the checks they
                       share and their runner, the app's data and processes,
                       the window per desktop, the WebDriver acts, client and
                       driver process, and the fake Linux desktop services)
```

**Dependencies only point one way**, and ESLint refuses an import that does not
(`scripts/eslint/layers.js`; a test checks that this drawing is the one it enforces).
Each package, with what it may import:

```
domain          ← —
view            ← domain
engines         ← domain, one another
ipc-client      ← domain
store           ← domain, view, engines, ipc-client
design-system   ← domain, view
bodymap         ← domain, view, coverage, design-system
screens         ← domain, view, engines, design-system, bodymap
app             ← all of them

engines: dataset, coverage, scheduling, progression, session, nudge, analytics, program-editor, serialization
screens: shell, today, planner, progress, modals
```

Engines know nothing about React, the view vocabulary or the store; screens use the
engines but never the store or the backend; only `app` joins the two sides, in
`packages/app/src/containers/` (select state → build the view-model → bind the
actions). The store is the only place that persists. View vocabulary lives in `view`
rather than `domain` so that the engines never see it, and so that neither the store
nor a screen has to declare the other's types.

**Every screen package** (`shell`, `today`, `planner`, `progress`, `modals`) has the
same shape:

- `index.ts` only exports: the root component, its `build…VM` function, and the types
  the app (or a test) needs of them.
- View-models are in `<name>-vm.ts`: the `<Name>VM` types and a pure
  `build<Name>VM` function that turns domain objects into exactly what is rendered,
  every word already written, and every change a control makes already worked out (a
  settings row carries its patch, a chip of a multi-select the list it leaves). The
  screen's own is `<screen>-vm.ts`.
- `<screen>-actions.ts` declares `<Screen>Actions`: what the screen asks of the app.
- `options.ts` holds the package's pickers (what each `Segmented`, `Dropdown` or chip
  group offers), built with `optionsOf(keys, names)` — the names a domain table or a
  naming function — or, where the labels are the screen's own, written out; a picker
  more than one screen offers lives below them (the muscles in `bodymap`, the themes in
  `design-system`). `wording.ts` holds every word a component shows that its view-model
  does not carry (headings, button and field labels: its `WORDS`) and any text helpers;
  it is the package's one wording module, and a component writes no words of its own.
  Words two screens say of the same thing are written once, below them
  (`COMMON_WORDS` and `SCREEN_NAMES` in `design-system`).
- Components are one per file, named after the file, each with a `<Name>Props`
  interface, and take their props by one rule:
  - **`vm`** — the view-model, or the part of it, that the component draws. Anything
    else it needs is a plain, named value (`dayId`, `columns`, `text`).
  - **`actions`** — the screen's actions interface, or a `Pick<>` of it, for a
    component that calls the screen's asks itself (the root, and any section or row
    below it).
  - **`onX` callbacks** — instead of `actions`, never beside it — for a component whose
    events mean what its parent says they mean: the parent supplies the closure
    (`MoveButtons.onMove`, `SetTable.onEdit`, `StepperCard.onStep`).
  - Nothing is passed through React context.

In the planner every change to the program is a `ProgramEdit` — `(editor) =>
editor.moveDay(id, 1)` — handed to the one `edit` action; a change to a prescription is a
`PrescriptionEdit` handed to `editor.editPrescription`. Each operation is declared once,
on `ProgramEditor` or `PrescriptionEditor`, and written out where the user triggers it;
both work alike: a method returns a new program (or prescription) and leaves the one it
was given untouched.

In the store, the actions are grouped as slices (`DaySlice`, `LoggingSlice`, … in
`slices.ts`, one file each). A slice never imports another slice: what it needs of
another it asks for through `get().action()`, and what two of them share lives in a
helper module (`state`, `context`, `persistence`, `unsaved-sets`, `hydration`,
`rollover`, `open-session`, `os`, `selectors`, `settle`).

## Credits

- Body-map SVG paths vendored from
  [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)
  (MIT, © 2022 ELABBASSI Hicham) — `packages/bodymap/src/drawing/LICENSE`.
- Bundled fonts: Hanken Grotesk and JetBrains Mono (SIL Open Font License 1.1) —
  `packages/app/public/fonts/OFL.txt`.
- Full attribution is in `NOTICE`.
- © 2026 Mohammad Ewais — MIT (`LICENSE`).
