// The shell's pickers: what each one offers.

import type { IconName } from "@nabd/design-system";
import { SCREEN_NAMES } from "@nabd/design-system";
import type { Screen } from "@nabd/view";

interface NavItem {
  screen: Screen;
  label: string;
  icon: IconName;
}

/** The screens, in sidebar order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { screen: "today", label: SCREEN_NAMES.today, icon: "today" },
  { screen: "planner", label: SCREEN_NAMES.planner, icon: "plan" },
  { screen: "progress", label: SCREEN_NAMES.progress, icon: "progress" },
];
