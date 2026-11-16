// The modals' pickers: what each one offers.

import type { Option, SegOption } from "@nabd/design-system";
import { optionsOf } from "@nabd/design-system";
import type { Equipment, MuscleGroup, TrackingType, Weekday, WeightUnit } from "@nabd/domain";
import {
  EQUIPMENT_KEYS,
  EQUIPMENT_NAMES,
  MUSCLE_GROUPS,
  TRACKING_KEYS,
  TRACK_NAMES,
  WEEK_ORDER,
  WEIGHT_UNITS,
  weekdayShort,
} from "@nabd/domain";

export const EQUIPMENT_OPTIONS: readonly Option<Equipment>[] = optionsOf(
  EQUIPMENT_KEYS,
  EQUIPMENT_NAMES,
);

export const TRACKING_OPTIONS: readonly Option<TrackingType>[] = optionsOf(
  TRACKING_KEYS,
  TRACK_NAMES,
);

/** The group filter's "no filter" choice. */
export type GroupFilter = MuscleGroup | "all";

/** A name that is its own label: a muscle group, a weight unit. */
const asItself = (name: string): string => name;

export const GROUP_OPTIONS: readonly Option<GroupFilter>[] = [
  { value: "all", label: "All" },
  ...optionsOf(MUSCLE_GROUPS, asItself),
];

export const WEIGHT_UNIT_OPTIONS: readonly SegOption<WeightUnit>[] = optionsOf(
  WEIGHT_UNITS,
  asItself,
);

/** The days one can work on, Monday to Sunday: "Mon" … "Sun". */
export const WORKDAY_OPTIONS: readonly Option<Weekday>[] = optionsOf(WEEK_ORDER, weekdayShort);
