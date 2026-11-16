// @nabd/design-system — the theme, the design tokens and every presentational
// primitive the screens are built from. No app logic.

export { ANIMATION } from "./global-styles";
export {
  COLOR,
  ELLIPSIS,
  FONT,
  RADIUS,
  SHADOW,
  SURFACE2_BOX,
  TEXT,
  Z,
  shade,
  tint,
  toneColor,
} from "./tokens";
export type { ModalLayer, Tone } from "./tokens";

export { ThemeProvider } from "./theme-provider";
export type { ThemeProviderProps } from "./theme-provider";
export { THEME_OPTIONS } from "./theme-options";

export { Page } from "./page";
export type { PageProps } from "./page";
export { Card } from "./card";
export type { CardProps, CardVariant } from "./card";
export { CardButton } from "./card-button";
export type { CardButtonProps } from "./card-button";
export { Eyebrow } from "./eyebrow";
export type { EyebrowProps } from "./eyebrow";
export { EmptyNote } from "./empty-note";
export type { EmptyNoteProps } from "./empty-note";
export { StatTile } from "./stat-tile";
export type { StatTileProps } from "./stat-tile";
export { Swatch } from "./swatch";
export type { SwatchProps } from "./swatch";

export { Icon } from "./icon";
export type { IconProps } from "./icon";
export type { IconName } from "./icon-paths";
export { BrandMark } from "./brand-mark";
export type { BrandMarkProps } from "./brand-mark";

export { Button } from "./button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./button";
export { IconButton } from "./icon-button";
export type { IconButtonProps, IconButtonVariant } from "./icon-button";
export { RowButton } from "./row-button";
export type { RowButtonProps } from "./row-button";
export { NavButton } from "./nav-button";
export type { NavButtonProps } from "./nav-button";

export type { Option } from "./option";
export { Stepper } from "./stepper";
export type { StepperProps, StepperSize } from "./stepper";
export { Toggle } from "./toggle";
export type { ToggleProps } from "./toggle";
export { Segmented } from "./segmented";
export type { SegOption, SegmentedProps } from "./segmented";
export { Dropdown } from "./dropdown";
export type { DropdownProps } from "./dropdown";
export { TextInput } from "./text-input";
export type { TextInputProps } from "./text-input";
export { TitleInput } from "./title-input";
export type { TitleInputProps } from "./title-input";

export { Chip } from "./chip";
export type { ChipProps, ChipVariant } from "./chip";
export { Badge } from "./badge";
export type { BadgeProps } from "./badge";
export { ChipToggle } from "./chip-toggle";
export type { ChipToggleProps } from "./chip-toggle";
export { ChipGroup } from "./chip-group";
export type { ChipGroupProps } from "./chip-group";

export { FormSection } from "./form-section";
export type { FormSectionProps } from "./form-section";
export { FormRow } from "./form-row";
export type { FormRowProps } from "./form-row";
export { ModalShell } from "./modal-shell";
export type { ModalShellProps } from "./modal-shell";
export { ConfirmDialog } from "./confirm-dialog";
export type { ConfirmDialogProps } from "./confirm-dialog";

export { BarChart } from "./bar-chart";
export type { BarChartProps, BarDatum, BarTone } from "./bar-chart";
export { Sparkline } from "./sparkline";
export type { SparklineProps } from "./sparkline";
export { LineChart } from "./line-chart";
export type { LineChartProps } from "./line-chart";
export { MeterBar } from "./meter-bar";
export type { MeterBarProps } from "./meter-bar";

export { LiveDot } from "./live-dot";
export type { LiveDotProps } from "./live-dot";
export { AdviceCard } from "./advice-card";
export type { AdviceCardProps, AdviceText } from "./advice-card";
