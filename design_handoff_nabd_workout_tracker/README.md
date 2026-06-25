# Handoff: Nabḍ — Desk Workout Tracker & Planner

## Overview
**Nabḍ** (Arabic *نبض*, "pulse") is a **desktop** workout app for remote workers who spread a full
workout across the workday — doing one set every 15–50 min between meetings, builds, or LLM waits,
rather than one continuous gym session. It silently watches for idle time (no keyboard/mouse) and/or a
timer; whichever fires first, it nudges the user to do the next set. The user confirms or snoozes, logs
the set, and the visuals (muscle coverage, progress) update.

It supports two planning modes:
- **Fixed plan** — specific exercises scheduled per day.
- **Cycled plan** — each day targets **muscle groups**; each group has a *pool* of exercises that it
  rotates through independently (a 3-exercise group and a 2-exercise group drift out of sync over the
  week). The plan guarantees the *muscle* is hit; only the specific exercise rotates.

## About the Design Files
The files in this bundle are **design references created in HTML** — an interactive prototype showing
the intended look, layout, and behavior. They are **not production code to ship directly**. The task is
to **recreate these designs in the target codebase's environment** (this is a desktop app — Electron +
React, Tauri, native, etc.) using its established patterns, component library, and state management.
If no codebase exists yet, pick the most appropriate stack for a cross-platform desktop tray app
(Electron or Tauri recommended — translucency + idle detection + tray + notifications all need a native
shell) and implement there.

The prototype is built as a single "Design Component" HTML file driven by a small runtime
(`support.js`). Treat the **rendered UI and the documented behavior below** as the source of truth, not
the runtime mechanics.

## Screens (dark theme)
Reference captures of every screen are in `screens/` (dark theme, solid):
- `screens/today.png` — Today: next-set hero, today's rhythm timeline, muscle coverage map, day donut.
- `screens/plan.png` — Plan: week board, day editor with the sets table, live weekly-coverage rail.
- `screens/progress.png` — Progress: KPI strip, consistency calendar, completion rate, time-of-day,
  "what prompts a set."
- `screens/log-sets.png` — Log Sets session modal (two-pane: exercise list + per-set log form).
- `screens/settings.png` — Settings: theme + translucent toggle, startup, notifications, data.


## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, layouts, and interactions are all
specified. Recreate the UI pixel-faithfully using the codebase's libraries. Exact token values are in
the **Design Tokens** section.

---

## Global Layout & Chrome

A fixed desktop window, `100vh`, no body scroll; inner content panes scroll.

- **Sidebar** (left, `width: 250px`, `flex: none`): brand lockup (anatomical-heart logo in an accent
  rounded square + "Nabd · نبض" / "PULSE · v0.1"), nav items (**Today**, **Plan**, **Progress**), and a
  day-progress **donut** at the bottom (conic-gradient ring showing sets done / total).
- **Top bar**: time-aware greeting + date (left), a live status pill (`clock` · `next: timer` ·
  `idle: timer`) with a pulsing live dot, a **theme segmented control** (Light / Dark), a **Glass**
  toggle button (translucency on/off), and a **settings gear** button (40×40, icon-only).
- **Main content**: the active screen, scrollable, `padding: 26px`.

### Nav item states
- Active: `background: var(--surface2)`, left accent bar (`box-shadow: inset 3px 0 0 var(--accent)` or
  similar), `var(--text)`, bold.
- Inactive: transparent, `var(--text2/3)`.

---

## Screens / Views

### 1. Today
Two-column body (`grid` ~ `1.5fr 1fr`).

**Left column**
- **Next-set hero card** (`var(--surface)`, radius 18px, padding 24px):
  - Kicker: `UP NEXT · <time>` (accent, JetBrains Mono, letter-spacing .12em) and the muscle group
    (right).
  - Exercise name: 32px / weight 800 / letter-spacing −.025em.
  - Muscle chips (pill, `var(--surface2)`, 12px).
  - **AI suggestion** row: accent lightning badge + "Suggested **3×19** · +1 rep over last session".
  - Buttons: **Start set** (filled accent, white text) and **Snooze 5m** (outline).
- **Today's rhythm** card: a timeline list of the day's set slots. Each row = time (mono) · status dot ·
  exercise name + group/muscles · result-or-status badge · **Start** button.
  - Statuses: `done` (shows logged result, e.g. "3×9"), `now` (highlighted row, Start always visible),
    `upcoming` (Start appears **on row hover**), `skipped`.
  - Any non-done set can be started out of order (hover reveals its Start).

**Right column**
- **Muscle coverage** card: stylized front + back anatomical body maps (SVG) tinted by 7-day coverage.
  Toggles: `Heat / Outline` (fill vs stroke) and `Both / Front / Back`. Below: per-muscle bars with %
  and "rest/push" recommendation tags.
- **Volume insight** card: "Rest these — <muscles> are well-trained" / "Push these — <muscles> are
  lagging."
- **3 stat tiles**: day streak, sets/week, kg volume (mono numerals).

### 2. Plan (Week Board planner)
- **Program header**: program name; `Fixed | Cycled` segmented; `Weekdays | Floating` segmented; **gym
  profile** dropdown (Home rack / Commercial gym / Travel-bands — switching filters the exercise
  library by available equipment).
- **Week board**: in Weekdays mode a Mon–Sun grid of day cards (rest days + "Add day"); in Floating mode
  ordered "DAY 1/2/3…" cards. Each card shows its exercises (or muscle-group chips for cycled;
  superset members tinted with `--accent2`). Click a card to edit it below.
- **Day editor**:
  - Header: editable day name; weekday picker (only in Weekdays mode) or "Day N · floating" pill;
    summary ("5 exercises · 16 sets · ~54 min"); Delete day.
  - **Fixed mode** — list of exercise cards. Each card: name + muscle/equipment tags; a **sets table**
    with a header row (`SET · REPS|TIME · RPE|%1RM`); per-set rows = a type badge (click to cycle
    Warm-up `W` / Working `1,2,3…` / Drop `D`), rep steppers (single, range `a–b`, or time `+ sec`),
    intensity steppers (RPE shown as `8`, %1RM as `70%`), and remove. Per-exercise: rep-mode segmented
    (Range/Reps/Time), load segmented (—/RPE/%1RM), rest stepper, **+ Add set / + Warmup / ⛓ Superset**,
    and a **notes** input. Supersets wrap consecutive exercises in an `--accent2` bordered group (A1/A2…).
  - **Cycled mode** — muscle-group **slots**. Each slot: group name; an **exercise pool** (chips +
    "Add exercise"); a **prescription** block that is the *same* sets editor as fixed (applies to
    whichever exercise rotates in); and a notes input. "+ Add muscle group" chips below.
- **Exercise library modal** (opened by "+ Add exercise"): search box, muscle-group filter chips, list
  of exercises **filtered to the active gym profile's equipment**. Each row: name (+ CUSTOM badge),
  muscles, tracking-type label, equipment tag, a `+` (add) and a **duplicate** button (opens the create
  form pre-filled). Footer: **Create a custom exercise** → form with name, primary muscle group,
  multi-select secondary muscles, tracking type (Weight & reps, Bodyweight reps, Weighted/Assisted
  bodyweight, Duration, Weight & duration, Distance & duration, Reps only), and equipment (scoped to
  profile). Created exercises persist in the user library.
- **Coverage rail** (right): live weekly-volume heatmap (front/back maps + per-muscle "sets" bars) that
  **updates as the plan is edited**.

### 3. Progress
Single column, ordered by importance:
1. **KPI strip** (4 tiles): Current streak · Completion this wk · Sets this week · Active days (30d).
2. **Consistency** card with a `Calendar | Weekly` tab toggle (month heatmap grid of training
   intensity, or last-8-weeks set bars) **beside** a **Completion rate** card (big %, last-7-days bars).
3. **Time of day** (hourly histogram of when sets get logged, with a peak callout) **+** **What prompts
   a set** (Idle / Timer / Manual split bar + legend) — the desk-specific analytics.
4. **Sets per muscle** — the anatomical heatmap (front/back maps + per-muscle bars), kept prominent.
5. **Progression & records** (last): per exercise, a 30-day **line sparkline**, the personal **best**
   (trophy), and the monthly **gain** badge. **Clicking a row opens a full-history modal** — a large
   area+line chart spanning the entire history since start, with gridlines, start→now axis, and
   Personal-best / Current / All-time-gain stats.

---

## Modals & Overlays
- **Set-entry / session modal** — opened from Start set / a rhythm row / a confirmed nudge. It is a
  **two-pane multi-exercise session**. **Left pane:** a list of today's exercises, each with its muscles
  and a live set-progress count (e.g. "Calf Raise · 0/6 sets"; fully-done ones get a green check) — tap
  any to select it. **Right pane:** the log form for the selected exercise — a **"Set X of Y"** line,
  muscles, the per-set AI suggestion, and steppers for **Reps (or Sec) / Weight (kg, when weighted)**.
  There is no "number of sets" stepper: each **Log this set** records exactly one set, banks it into the
  "Logged this session" receipt, increments that exercise's progress, ticks coverage + the day donut by
  one set, and resets the timer. The form stays on the same exercise until its sets are done, but the
  user can jump to **any** exercise in the left list at any time — so one break can hold several sets
  across several exercises (the whole point of the desk-workout model). A footer shows "N sets logged
  this session" and a **Done** button. The Today rhythm shows in-progress exercises as "1/3 sets"; the
  donut counts individual completed sets out of the day's planned total.
- **Notification toast** (bottom-right, fixed) — "TIME TO MOVE", reason (timer/idle), exercise, "Let's
  go" / "Snooze". Pulsing dot.
- **Settings modal** (gear) — sections:
  - **Appearance**: Theme (Light / Dark) + a **Translucent window** toggle; (when translucent) a
    background-opacity stepper (with a legibility floor) + 7 preview-wallpaper swatches (Aurora / Dusk /
    Slate / Mesh / Sand / Frost / Mixed — including light and mixed-luminance ones to prove legibility).
  - **Startup**: Open at startup, Start minimized (toggles).
  - **Notifications**: Time between sets (min stepper), Idle before a nudge (sec stepper).
  - **Data**: Export data (downloads `nabd-data.json` of plan + custom exercises + settings), Import data
    (file picker, applies a saved JSON).
- **Full-history chart modal** (Progress) — described above.

---

## Interactions & Behavior
- **Idle + timer nudge engine**: a 1s tick decrements a "next set" countdown and increments an idle
  counter (reset by `mousemove/mousedown/keydown/wheel/touchstart`). When `countdown==0` **or**
  `idle ≥ idleNudge`, raise a notification (whichever first). Confirm → set-entry modal; Snooze →
  +5 min, reset idle. Manual start any time.
- **Out-of-order sets**: in Today's rhythm, hovering any upcoming row reveals its Start; starting logs
  that specific set and advances the sequential pointer.
- **Live heatmap**: planner edits recompute weekly sets/muscle (primary muscle = full set count,
  secondary = ½) and re-tint the body maps + bars.
- **Cycled rotation**: each session pulls the next exercise from each group's pool (round-robin), so
  pools of different sizes drift out of phase.
- **Translucency (the "two materials" model)**: translucency is a **modifier on the theme, not a third
  theme**. There are two real themes — **Light** and **Dark** — each with a solid material and a **glass**
  material. The **Glass toggle** swaps in the matching glass material (Dark→`darkGlass`, Light→
  `lightGlass`). Critically, **the wallpaper never decides text color — the theme does**; the glass
  material guarantees contrast against its own tint, so the same UI is legible over *any* desktop
  (light, dark, or mixed/gradient).
  How it works: the app shell paints a semi-opaque **tint/scrim** (`darkGlass` →
  `rgba(15,17,24,<op>)`, `lightGlass` → `rgba(244,246,251,<op>)`) with
  `backdrop-filter: blur(34px) saturate(1.7)`, over a fixed full-bleed wallpaper layer (`z-index:0`).
  The blur destroys backdrop detail; the tint floods luminance into a known range; **text sits on the
  tint/surfaces, never on the raw wallpaper**, so the wallpaper only ever shows through window margins
  and the gaps between cards. The **opacity slider drives the tint alpha with a hard floor** (Light
  glass floor 0.60, Dark glass floor 0.50, max 0.92) so it can't be dragged into illegibility — it tunes
  scrim strength, never text color.
  Each glass material **re-specifies** its surfaces, borders (brighter `--line` — separation comes from
  the edge, since translucent fills barely differ), `--text3` (raised one step, because faint-gray-on-
  faint-gray dies on glass), the **accent** (Light-glass accent darkened to `oklch(0.53 …)` so white-on-
  accent and accent-as-text both clear contrast; Dark-glass accent brightened), and the **non-text
  tints** that break first on glass — `--map-muscle` (the body map), donut/gridline/sparkline/bar colors.
  Two extra tokens are provided per glass material for the "wet glass" edge: `--glow`
  (`inset 0 1px 0 …` top inner highlight) and `--cardshadow` (heavier outer shadow — glass needs *more*
  shadow, not less, to separate from a busy backdrop); apply them to cards/modals.
  In a real desktop app the wallpaper is the **actual OS desktop** behind a transparent window —
  implement with native window vibrancy/acrylic (macOS `NSVisualEffectView` light/dark materials /
  Windows Acrylic / Tauri/Electron vibrancy), choosing the light vs dark material from the app theme and
  letting the opacity slider control tint strength. For user-supplied wallpapers, also apply a fixed
  contrast-floor veil so no photo can blow out the text.
- Hover states on rows/cards: subtle `background: var(--surface2)`. Transitions ~.14–.5s ease.
- Animations: toast slide-up, modal fade-up, blink on live dot, bar/width transitions on coverage.

## State Management
Core state: `theme`, `screen`, planning `mode`, `now` (live clock), `secondsToNext`, `idleSeconds`,
`idleNudge`, `interval` (min between sets), `doneCount`, `slots` (today's rhythm, each with
status/result/sets), `coverage` (per-muscle %), `program` (`{name, type:fixed|cycled, schedule:
weekday|floating, days:[{name, weekday, exercises:[{exId, repMode, intensity, rest, sets:[…], notes,
supersetId}], slots:[{group, pool:[exId], repMode, intensity, rest, sets, notes}]}]}`),
`customExercises`, `activeProfileId`, `settings` `{opacity, wallpaper, openAtStartup,
minimizedByDefault}`, plus UI flags (`settingsOpen`, `activeSet`, `notif`, library modal state,
`progTab`, `progExercise`).

Persist: program, customExercises, settings, history (for progression/PRs), theme. Export/Import is a
JSON snapshot of these.

## Design Tokens

**Fonts**
- Display/body: **Hanken Grotesk** (weights 400/500/600/700/800).
- Numerals, labels, time, code-y tags: **JetBrains Mono** (400/500/600).

**Themes** (CSS custom properties; oklch + rgba). Accent default is a warm orange; the prototype's
tweak panel also allows a custom accent.

Solid themes:

| Token | Light | Dark |
|---|---|---|
| `--bg` | `oklch(0.97 0.003 250)` | `oklch(0.21 0.014 265)` |
| `--surface` | `#fff` (`oklch(1 0 0)`) | `oklch(0.25 0.016 265)` |
| `--surface2` | `oklch(0.955 0.004 250)` | `oklch(0.295 0.018 265)` |
| `--line` | `oklch(0.9 0.005 250)` | `oklch(0.36 0.018 265)` |
| `--text` | `oklch(0.24 0.01 255)` | `oklch(0.96 0.01 265)` |
| `--text2` | `oklch(0.5 0.012 255)` | `oklch(0.74 0.014 265)` |
| `--text3` | `oklch(0.66 0.01 255)` | `oklch(0.58 0.014 265)` |
| `--accent` | `oklch(0.6 0.16 45)` | `oklch(0.7 0.16 48)` |
| `--accent2` (green) | `oklch(0.62 0.13 155)` | `oklch(0.72 0.13 158)` |
| `--accent3` (blue) | `oklch(0.58 0.12 255)` | `oklch(0.7 0.12 252)` |
| `--map-muscle` | `oklch(0.86 0.006 250)` | `oklch(0.42 0.02 265)` |

Glass materials (`--bg` is the computed tint above; everything else re-specified for legibility on glass):

| Token | lightGlass | darkGlass |
|---|---|---|
| tint (`--bg`) | `rgba(244,246,251,<op 0.60–0.92>)` | `rgba(15,17,24,<op 0.50–0.92>)` |
| `--surface` | `rgba(255,255,255,0.62)` | `rgba(255,255,255,0.075)` |
| `--surface2` | `rgba(24,28,40,0.06)` | `rgba(255,255,255,0.135)` |
| `--line` | `rgba(20,24,35,0.16)` | `rgba(255,255,255,0.18)` |
| `--text` | `oklch(0.2 0.012 260)` | `rgba(255,255,255,0.98)` |
| `--text2` | `oklch(0.38 0.014 260)` | `rgba(255,255,255,0.78)` |
| `--text3` | `oklch(0.5 0.014 260)` | `rgba(255,255,255,0.6)` |
| `--accent` | `oklch(0.53 0.18 42)` | `oklch(0.72 0.17 48)` |
| `--accent2` (green) | `oklch(0.5 0.14 158)` | `oklch(0.76 0.14 158)` |
| `--accent3` (blue) | `oklch(0.5 0.14 255)` | `oklch(0.74 0.14 252)` |
| `--map-muscle` | `rgba(34,38,52,0.18)` | `rgba(255,255,255,0.2)` |
| `--glow` (inner highlight) | `inset 0 1px 0 rgba(255,255,255,0.55)` | `inset 0 1px 0 rgba(255,255,255,0.14)` |
| `--cardshadow` | `0 6px 22px rgba(20,28,48,0.16)` | `0 6px 22px rgba(0,0,0,0.28)` |

Glass frost: `backdrop-filter: blur(34px) saturate(1.7)`. Preview wallpapers: Aurora (teal/blue radial),
Dusk (purple/orange radial), Slate (dark linear), Mesh (multi-radial), Sand (warm light radial), Frost
(cool light radial), Mixed (dark→light diagonal — the worst-case legibility test).

**Radii**: cards/panels 16–18px; inner cards 11–14px; buttons/inputs 8–12px; pills/donut 999px; badges
5–8px. **Sidebar** 250px. **Set-type badge** 26×26 radius 7.

**Type scale (px)**: hero exercise 32/800; screen title 22/800; section title 15/700; card value 30/600
mono; body 13–14; labels/mono 9.5–12 (letter-spacing .06–.12em on uppercase mono labels).

**Shadows**: cards rest flat with 1px `--line` border; modals `0 24px 70px rgba(0,0,0,.3–.4)`; toast
`0 18px 50px rgba(0,0,0,.22)`.

## Assets
- **Anatomical body maps** (front/back, highlightable regions): paths in `bodyData.js`, adapted from
  **react-native-body-highlighter** (MIT, © 2022 ELABBASSI Hicham). Mapped to coverage muscles in the
  component's `SLUG_MAP`.
- **Logo**: hand-built inline SVG anatomical heart (organ body + great vessels + coronary grooves), in
  the sidebar markup. Replace with the codebase's icon system if preferred.
- **Other icons**: inline stroke SVGs (Feather-style). Use the codebase's icon library.
- No external image files; wallpapers and charts are CSS gradients / inline SVG.

## Files
- `Nabd.dc.html` — the full interactive prototype (all screens, modals, themes, logic). Primary
  reference. Open it to interact; read it for exact markup/values.
- `exercises.js` — seed exercise library (~85 exercises) tagged with `g` (group), `p`/`s` (primary/
  secondary muscles), `e` (equipment), `t` (time-based), `track` (tracking type); plus `EQUIPMENT`,
  `GYM_PROFILES`, `MUSCLE_GROUPS`.
- `bodyData.js` — front/back anatomical SVG path data.
- `support.js` — the prototype runtime (lets the HTML run standalone). **Not** part of the design to
  reimplement; ignore for production.

To run the prototype offline: open `Nabd.dc.html` in a browser (the three `.js` files must sit beside
it).
