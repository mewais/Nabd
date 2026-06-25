# B18 · @nabd/shell — app chrome (React)

Interface frozen in `src/index.ts`. Props-driven; uses @nabd/design-system primitives
+ Icon. Prototype refs: sidebar markup (Nabd.dc.html ~L34-69), top bar (~L72-92),
nav item states (README "Nav item states"). Tests assert behavior/DOM, not pixels.

## Behavior
- `greeting(hour)`: <12 "Good morning"; <18 "Good afternoon"; else "Good evening".
- `formatDate(now)`: `<WEEKDAY upper> · <Mon> <date>` e.g. "MONDAY · Jun 24" (use the
  same month/day names as the prototype: Jan..Dec, Sunday..Saturday).
- `formatClock(now)`: `HH:MM` zero-padded 24h.
- `formatDuration(seconds)`: `Math.floor(s/60)+":"+pad2(s%60)`; (the kicker uses "now"
  for 0 elsewhere — here just format).
- `Sidebar`: brand lockup (heart Icon + "Nabd · نبض" / "PULSE · v0.1"), three nav
  buttons (Today/Plan/Progress) via Icon+label; the active one (screen===key) is
  styled active (accent inset bar / bold / surface2) and others call
  onNavigate(key) on click; bottom Donut(pct, setsDone, setsTotal, caption).
- `TopBar`: greeting + dateStr (left); a status pill showing a LiveDot(notifActive),
  clockStr, "next <nextStr>", "idle <idleStr>" (idle text accented when idleActive);
  a theme Segmented (Translucent/Light/Dark) → onTheme; a settings gear Button →
  onOpenSettings.
- `AppLayout`: renders the wallpaper layer + a frosted root (ThemeProvider/themeVars),
  a 250px sidebar slot and a main column with the topbar slot + scrollable children.

## Test Cases
- greeting at 8/13/20; formatDate for a known Date; formatClock pad; formatDuration 0,
  65, 600.
- Sidebar: renders 3 nav items; clicking "Plan" calls onNavigate("planner"); active
  item (screen="today") is marked distinctly vs inactive; Donut shows setsDone/total.
- TopBar: shows greeting/date/clock/next/idle; idleActive toggles the idle style; theme
  Segmented active = current theme and selecting calls onTheme; gear calls onOpenSettings;
  LiveDot active reflects notifActive.
- AppLayout: renders sidebar/topbar/children slots; applies theme vars (light vs dark
  differ); wallpaper layer present for translucent, hidden otherwise.
Cover every export + branch → 100%.

## Boundaries
Code agent: only `packages/B18-shell/src/`. Tests RO. Import @nabd/domain,
@nabd/design-system, react. No signature changes.
