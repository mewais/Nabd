import type { IconName } from "@nabd/design-system";
import type { Screen } from "@nabd/domain";

export interface NavItem {
  screen: Screen;
  label: string;
  icon: IconName;
}

/** The screens, in sidebar order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { screen: "today", label: "Today", icon: "today" },
  { screen: "planner", label: "Plan", icon: "plan" },
  { screen: "progress", label: "Progress", icon: "progress" },
];
