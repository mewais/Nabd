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
export type { Tone } from "./tokens";

export { ThemeProvider } from "./theme-provider";
export { THEME_OPTIONS } from "./theme-options";

export { Page } from "./page";
export { Card } from "./card";
export { CardButton } from "./card-button";
export { Eyebrow } from "./eyebrow";
export { EmptyNote } from "./empty-note";
export { StatTile } from "./stat-tile";
export type { StatFigure } from "./stat-tile";
export { Swatch } from "./swatch";

export { Icon } from "./icon";
export type { IconName } from "./icon-paths";
export { BrandMark } from "./brand-mark";

export { Button } from "./button";
export type { ButtonVariant } from "./button";
export { IconButton } from "./icon-button";
export { RowButton } from "./row-button";
export { NavButton } from "./nav-button";

export { optionsOf } from "./option";
export type { Option } from "./option";
export { Stepper } from "./stepper";
export { Toggle } from "./toggle";
export { Segmented } from "./segmented";
export type { SegOption } from "./segmented";
export { Dropdown } from "./dropdown";
export { TextInput } from "./text-input";
export { TitleInput } from "./title-input";

export { Chip } from "./chip";
export { Badge } from "./badge";
export { ChipToggle } from "./chip-toggle";
export { ChipGroup } from "./chip-group";

export { FormSection } from "./form-section";
export { FormRow } from "./form-row";
export { ModalShell } from "./modal-shell";
export { ConfirmDialog } from "./confirm-dialog";

export { BarChart } from "./bar-chart";
export type { BarDatum } from "./bar-chart";
export { Sparkline } from "./sparkline";
export { LineChart } from "./line-chart";
export { MeterBar } from "./meter-bar";

export { LiveDot } from "./live-dot";
export { AdviceCard } from "./advice-card";
export { NextSetBlock } from "./next-set-block";
