// @nabd/design-system — the theme, the design tokens and every presentational
// primitive the screens are built from. No app logic.
//
// Screens compose these and write no CSS of their own: spacing, type and
// colour are props that name a step of a scale (`gap="md"`, `variant="hint"`,
// `tone="accent"`). ESLint holds them to it (scripts/eslint/styling.js).

export { COLOR } from "./tokens";
export type { Space, TextRole, Tone } from "./tokens";

export { ThemeProvider } from "./theme-provider";
export { THEME_OPTIONS } from "./theme-options";

// Layout
export { Row } from "./row";
export { Stack } from "./stack";
export { Grid } from "./grid";
export { Columns } from "./columns";
export { WithSide } from "./with-side";
export { ScrollArea } from "./scroll-area";
export { Spacer } from "./spacer";
export { Divider } from "./divider";
export { Page } from "./page";

// Text
export { Text } from "./text";
export type { TextTone } from "./text";
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
export { Badge } from "./badge";

// Controls
export { Button } from "./button";
export type { ButtonVariant } from "./button";
export { IconButton } from "./icon-button";
export { RowButton } from "./row-button";
export { NavButton } from "./nav-button";
export { ChipToggle } from "./chip-toggle";
export { ChipGroup } from "./chip-group";
export { optionsOf } from "./option";
export type { Option } from "./option";
export { Stepper } from "./stepper";
export { Toggle } from "./toggle";
export { Segmented } from "./segmented";
export type { SegOption } from "./segmented";
export { Dropdown } from "./dropdown";
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
export type { SplitSegment } from "./split-bar";
export { HeatCell } from "./heat-cell";
export type { HeatLevel } from "./heat-cell";

// Composites
export { AdviceCard } from "./advice-card";
export { NextSetBlock } from "./next-set-block";
