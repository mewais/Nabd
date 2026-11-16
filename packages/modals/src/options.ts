// The modals' pickers: what each one offers.

import type { Option, SegOption } from "@nabd/design-system";
import { optionsOf } from "@nabd/design-system";
import type { Equipment, MuscleGroup, MuscleKey, TrackingType, WeightUnit } from "@nabd/domain";
import {
  EQUIPMENT_KEYS,
  EQUIPMENT_NAMES,
  MUSCLES_ANATOMICAL,
  MUSCLE_GROUPS,
  MUSCLE_NAMES,
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

export const MUSCLE_OPTIONS: readonly Option<MuscleKey>[] = optionsOf(
  MUSCLES_ANATOMICAL,
  MUSCLE_NAMES,
);

export const TRACKING_OPTIONS: readonly Option<TrackingType>[] = optionsOf(
  TRACKING_KEYS,
  TRACK_NAMES,
);

/** The group filter's "no filter" choice. */
export type GroupFilter = MuscleGroup | "all";

export const GROUP_OPTIONS: readonly Option<GroupFilter>[] = [
  { value: "all", label: "All" },
  ...MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
];

export const WEIGHT_UNIT_OPTIONS: readonly SegOption<WeightUnit>[] = WEIGHT_UNITS.map((unit) => ({
  value: unit,
  label: unit,
}));

/** Monday to Sunday, "Mon" … "Sun"; the value is the weekday number as text. */
export const WEEKDAY_OPTIONS: readonly Option[] = WEEK_ORDER.map((weekday) => ({
  value: String(weekday),
  label: weekdayShort(weekday),
}));
