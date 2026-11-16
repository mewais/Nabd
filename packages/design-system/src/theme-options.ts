import type { Theme } from "@nabd/domain";
import { THEMES, THEME_NAMES } from "@nabd/domain";
import { optionsOf } from "./option";
import type { SegOption } from "./segmented";

/**
 * The themes, as the options of a `Segmented<Theme>` switch. They are listed
 * here, not in a screen, because the design system is what draws a theme.
 */
export const THEME_OPTIONS: readonly SegOption<Theme>[] = optionsOf(THEMES, THEME_NAMES);
