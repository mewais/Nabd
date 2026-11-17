import type { Option } from "@nabd/design-system";
import { toggled } from "@nabd/domain";

/** One chip of a multi-select: what it offers, and the change that switches it on or off. */
interface ChipVM<V extends string | number, Patch> extends Option<V> {
  toggle: Patch;
}

/** A multi-select of chips: each with the change it makes, and the values that are on. */
export interface ChipsVM<V extends string | number, Patch> {
  chips: ChipVM<V, Patch>[];
  selected: readonly V[];
}

/**
 * The chips of `options` with `selected` on, each carrying the change
 * `patchOf` makes of the values it would leave on: pressing a chip toggles
 * its value in or out of the list.
 */
export function buildChipsVM<V extends string | number, Patch>(
  options: readonly Option<V>[],
  selected: readonly V[],
  patchOf: (values: V[]) => Patch,
): ChipsVM<V, Patch> {
  return {
    chips: options.map((option) => ({
      ...option,
      toggle: patchOf(toggled(selected, option.value)),
    })),
    selected,
  };
}
