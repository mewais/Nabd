import { ChipGroup, FormRow } from "@nabd/design-system";
import type { ChipsRowVM } from "./rows-vm";
import type { SettingsActions } from "./settings-actions";

interface ChipsRowProps<V extends string | number> {
  vm: ChipsRowVM<V>;
  actions: Pick<SettingsActions, "change">;
}

/** A setting of any number of values, each switched on and off with its chip. */
export function ChipsRow<V extends string | number>({
  vm,
  actions,
}: ChipsRowProps<V>): JSX.Element {
  return (
    <FormRow stacked title={vm.title} hint={vm.hint}>
      <ChipGroup
        options={vm.chips}
        selected={vm.selected}
        onToggle={(chip) => actions.change(chip.toggle)}
      />
    </FormRow>
  );
}
