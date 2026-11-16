// The planner's pickers: what each one offers.

import type { Intensity, ProgramType, Schedule } from "@nabd/domain";
import {
  INTENSITIES,
  INTENSITY_NAMES,
  WEEK_ORDER,
  weekdayInitial,
  weekdayName,
} from "@nabd/domain";
import { optionsOf } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import type { RepStyle } from "@nabd/program-editor";

export const PROGRAM_TYPE_OPTIONS: readonly SegOption<ProgramType>[] = [
  { value: "fixed", label: "Fixed" },
  { value: "cycled", label: "Cycled" },
];

/**
 * The two schedules. `weekdayBlocked` says why a weekday schedule cannot be
 * picked, when it cannot; the option then shows that as its tooltip.
 */
export function scheduleOptions(weekdayBlocked: string | null): SegOption<Schedule>[] {
  const blocked = weekdayBlocked === null ? {} : { disabled: true, title: weekdayBlocked };
  return [
    { value: "weekday", label: "Weekdays", ...blocked },
    { value: "floating", label: "Floating" },
  ];
}

/** Monday to Sunday, by initial; the value is the weekday number as text. */
export const WEEKDAY_OPTIONS: readonly SegOption[] = WEEK_ORDER.map((weekday) => ({
  value: String(weekday),
  label: weekdayInitial(weekday),
  ariaLabel: weekdayName(weekday),
  title: weekdayName(weekday),
}));

export const REP_STYLE_OPTIONS: readonly SegOption<RepStyle>[] = [
  { value: "range", label: "Range" },
  { value: "fixed", label: "Fixed" },
];

export const INTENSITY_OPTIONS: readonly SegOption<Intensity>[] = optionsOf(
  INTENSITIES,
  INTENSITY_NAMES,
);
