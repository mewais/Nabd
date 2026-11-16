import type { Theme } from "@nabd/domain";
import type { SegOption } from "./segmented";

/** The themes, as the options of a `Segmented<Theme>` switch. */
export const THEME_OPTIONS: readonly SegOption<Theme>[] = [
  { k: "light", label: "Light" },
  { k: "dark", label: "Dark" },
];
