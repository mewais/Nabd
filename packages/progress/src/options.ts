// The Progress screen's pickers: what each one offers.

import type { SegOption } from "@nabd/design-system";
import type { ProgressTab } from "@nabd/view";

export const PROGRESS_TAB_OPTIONS: readonly SegOption<ProgressTab>[] = [
  { value: "calendar", label: "Calendar" },
  { value: "weekly", label: "Weekly" },
];
