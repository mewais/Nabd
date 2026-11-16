// What the design system's primitives say themselves, and the words more than
// one screen says of the same thing: the screens' names, the theme switch, Settings.

import type { Direction } from "@nabd/domain";
import type { Screen } from "@nabd/view";

/** Words two screens say of the same thing, kept here, below both. */
export const COMMON_WORDS = {
  theme: "Theme",
  settings: "Settings",
  translucentWindow: "Translucent window",
  deleteDay: "Delete day",
  reps: "Reps",
} as const;

/** What each screen is called: in the sidebar, and as its own title. */
export const SCREEN_NAMES: Record<Screen, string> = {
  today: "Today",
  planner: "Plan",
  progress: "Progress",
};

/** The primitives' own words. */
export const WORDS = {
  /** The app's name in Arabic, beside the Latin one in the wordmark. */
  appNameArabic: "نبض",
  try: "Try",
  or: "or",
  useThis: "Use this",
  remove: "Remove",
  cancel: "Cancel",
  close: "Close",
} as const;

/** "reps" for "Reps", "set 1 RPE" for "Set 1 RPE": a name as it reads inside a phrase. */
const inPhrase = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

/** "Decrease reps", "Increase rest": what a stepper's − or + does. */
export const stepLabel = (direction: Direction, name: string): string =>
  `${direction < 0 ? "Decrease" : "Increase"} ${inPhrase(name)}`;
