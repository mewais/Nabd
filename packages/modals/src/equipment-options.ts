import type { Option } from "@nabd/design-system";
import type { Equipment } from "@nabd/domain";
import { EQUIPMENT_KEYS, EQUIPMENT_NAMES } from "@nabd/domain";

/** Every kind of equipment, as the options of a picker. */
export const EQUIPMENT_OPTIONS: readonly Option<Equipment>[] = EQUIPMENT_KEYS.map((value) => ({
  value,
  label: EQUIPMENT_NAMES[value],
}));
