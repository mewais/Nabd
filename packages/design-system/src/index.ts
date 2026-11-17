// @nabd/design-system — the theme, the design tokens and every presentational
// primitive the screens are built from. No app logic: the two composites at the
// end (AdviceCard inside NextSetBlock) draw a suggestion that Today and the
// logger both show, and live here because screens cannot import each other.
//
// Screens compose these and write no CSS of their own: spacing, type, colour
// and size are props that name a step of a scale. ESLint holds them to it
// (scripts/eslint/styling.js).
//
// CONVENTIONS — one vocabulary for every primitive:
//
//   tone       What a colour says, one `Tone` everywhere: its meaning (accent,
//              success, info, danger), how much it stands out (strong, muted,
//              faint), or onAccent. `neutral` is the component's own quiet colour.
//   size       One `Size` scale, xs … xxl; each component takes the steps it comes
//              in (`Extract<Size, "sm" | "md">`) and defaults to its usual one.
//              Icons take `IconSize`, the same steps.
//   width      Fixed widths are named after what they hold (`WIDTH`: "badge",
//              "sidebar", "rail" …), never given in px: grid tracks, panes,
//              columns. A modal or a page takes a `Size` step instead.
//   selected   The chosen one of a set: a list row, a tile, a destination.
//   on         A two-state switch that is on: Toggle, a toggling Button, a chip
//              of a ChipGroup (whose `selected` lists the values that are on), a
//              lit LiveDot. Progress through a task is a `state` (CheckMark).
//   ariaLabel  The accessible name, wherever one is given; a sub-control's is
//              `<part>AriaLabel` (Chip's `removeAriaLabel`).
//   variant    The look, by what it is for. `inset` is the quiet filled box with
//              a hairline wherever it appears (Card, IconButton, RowButton,
//              StatTile); `add` is the one dashed "add another" button.
//   onX        Events are `onClick`, `onChange(value)`, `onStep(direction)`,
//              `onSet(value)`, `onToggle(value)`.

export { COLOR } from "./tokens";
export type { Tone } from "./tokens";

export { ThemeProvider } from "./theme-provider";
export { THEME_OPTIONS } from "./theme-options";
export { COMMON_WORDS, SCREEN_NAMES } from "./wording";

// Layout
export { Row } from "./row";
export { Stack } from "./stack";
export { Grid } from "./grid";
export type { GridColumns } from "./grid";
export { Columns } from "./columns";
export { WithSide } from "./with-side";
export { ScrollArea } from "./scroll-area";
export { Spacer } from "./spacer";
export { Divider } from "./divider";
export { Page } from "./page";

// Text
export { Text } from "./text";
export { TitleBlock } from "./title-block";
export { EmptyNote } from "./empty-note";

// Panels
export { Card } from "./card";
export { CardButton } from "./card-button";
export { StatTile } from "./stat-tile";
export type { StatFigure } from "./stat-tile";
export { ModalShell } from "./modal-shell";
export { ConfirmDialog } from "./confirm-dialog";
export { ToastFrame } from "./toast-frame";
export { FormSection } from "./form-section";
export { FormRow } from "./form-row";

// Marks
export { Icon } from "./icon";
export type { IconName } from "./icon-paths";
export { BrandMark } from "./brand-mark";
export { Wordmark } from "./wordmark";
export { Swatch } from "./swatch";
export { CheckMark } from "./check-mark";
export { LiveDot } from "./live-dot";
export { Chip } from "./chip";

// Controls
export { Button } from "./button";
export { IconButton } from "./icon-button";
export { RowButton } from "./row-button";
export { ChipGroup } from "./chip-group";
export { optionsOf } from "./option";
export type { Option } from "./option";
export { Stepper } from "./stepper";
export { Toggle } from "./toggle";
export { Segmented } from "./segmented";
export type { SegOption } from "./segmented";
export { Dropdown } from "./dropdown";
export { MenuButton } from "./menu-button";
export { TextInput } from "./text-input";
export { NumberField } from "./number-field";
export { TitleInput } from "./title-input";

// Data
export { BarChart } from "./bar-chart";
export type { BarDatum } from "./bar-chart";
export { Sparkline } from "./sparkline";
export { LineChart } from "./line-chart";
export { MeterBar } from "./meter-bar";
export { ProgressRing } from "./progress-ring";
export { SplitBar } from "./split-bar";
export { HeatCell } from "./heat-cell";
export type { HeatLevel } from "./heat-cell";

// Composites
export { NextSetBlock } from "./next-set-block";
