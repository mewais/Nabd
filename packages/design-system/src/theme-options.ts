import type { Theme } from "@nabd/domain";
import type { SegOption } from "./segmented";

/** The themes, as the options of a `Segmented<Theme>` switch. */
export const THEME_OPTIONS: readonly SegOption<Theme>[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
