import type { IconName } from "@nabd/design-system";

export type Screen = "today" | "planner" | "progress";

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
