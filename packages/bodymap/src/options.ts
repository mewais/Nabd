// The body's pickers: what each one offers.

import type { MuscleKey } from "@nabd/domain";
import { MUSCLES_ANATOMICAL, MUSCLE_NAMES } from "@nabd/domain";
import { optionsOf } from "@nabd/design-system";
import type { Option } from "@nabd/design-system";

/** Every muscle, in the order they are read down the body, by name. */
export const MUSCLE_OPTIONS: readonly Option<MuscleKey>[] = optionsOf(
  MUSCLES_ANATOMICAL,
  MUSCLE_NAMES,
);
