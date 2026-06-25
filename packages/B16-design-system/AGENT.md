# B16 · @nabd/design-system — theme + primitives (React)

Interface frozen in `src/index.ts`. Token-driven, presentational only. Style refs:
the design tokens in README + prototype (THEMES/WALLPAPERS already in @nabd/domain).
Use `var(--accent)` etc.; never hard-code colors. Tests assert behavior/DOM/branches,
NOT exact pixels (the user does visual QA).

## Behavior
- `themeVars(theme, opacity)`: return a CSSProperties of the THEMES[theme] vars (the
  `--*` keys) plus, for translucent, the opacity-driven `--bg`/background handled in
  rootBackgroundStyle. Each key from THEMES[theme] must appear.
- `rootBackgroundStyle(theme, opacity)`: translucent → `{ background:
  "rgba(22,24,32,<opacity>)", backdropFilter: "blur(36px) saturate(1.5)",
  WebkitBackdropFilter: same }`; light/dark → `{ background: "var(--bg)" }`.
- `wallpaperStyle(theme, wallpaper)`: translucent → fixed inset:0 z-index:0 layer with
  `background: WALLPAPERS[wallpaper]`, display block; non-translucent → display:"none".
- `ThemeProvider`: renders a wrapper div with `style={themeVars(...)}` + the wallpaper
  layer + children. children render inside.
- `Button`: renders a `<button>`; filled → accent bg/white; outline → transparent +
  border; ghost → no border; calls onClick; `disabled` sets the attribute and skips
  onClick. Renders children.
- `Segmented`: renders one button per option; the option whose `k===value` is marked
  active (distinct style); clicking an option calls onChange(k). `small` tweaks padding.
- `Stepper`/`MiniStepper`: render value + two buttons; left calls onDec, right onInc;
  Stepper shows `label` when given.
- `Toggle`: renders a clickable track+knob; clicking calls onChange(!on); knob position
  reflects `on`.
- `Pill`/`Card`/`Badge`: render children in a styled span/div; `tone` selects the
  accent var. `style` prop merges.
- `Donut`: renders a conic-gradient ring at `pct`%, shows `done` and `total` and
  `caption`.
- `LiveDot`: a dot; `active` adds the blink animation/accent.
- `Icon`: returns an `<svg>` for the given `name` (each IconName must map to a path;
  `heart` is the logo). `size`/`stroke` applied.

## Test Cases
For each component: renders the expected element/role/text; callback fires on click
(use @testing-library/react + userEvent or fireEvent); each variant/branch produces a
distinguishable result (e.g. Button disabled does not call onClick; Segmented active
option differs from inactive; Toggle on vs off; every IconName renders an svg with a
path — loop over all names; themeVars includes every THEMES key; rootBackgroundStyle
and wallpaperStyle differ per theme). Cover every exported function/component +
every branch (variants, tones, disabled, active, translucent vs not) → 100%.

## Boundaries
Code agent: only `packages/B16-design-system/src/`. Tests RO. Import only @nabd/domain
+ react. No signature changes.
