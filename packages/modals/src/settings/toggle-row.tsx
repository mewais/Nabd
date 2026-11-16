import { FormRow, Toggle } from "@nabd/design-system";
import type { SettingsActions } from "./settings-actions";
import type { ToggleRowVM } from "./settings-vm";

interface ToggleRowProps {
  vm: ToggleRowVM;
  actions: Pick<SettingsActions, "change">;
}

/** An on/off setting with its switch. */
export function ToggleRow({ vm, actions }: ToggleRowProps): JSX.Element {
  return (
    <FormRow title={vm.title} hint={vm.hint}>
      <Toggle
        on={vm.on}
        onChange={() => actions.change(vm.flip)}
        ariaLabel={vm.title}
        disabled={vm.disabled}
      />
    </FormRow>
  );
}
