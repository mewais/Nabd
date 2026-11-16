import { FormRow, Stepper } from "@nabd/design-system";
import type { SettingsActions } from "./settings-actions";
import type { StepperRowVM } from "./settings-vm";

interface StepperRowProps {
  vm: StepperRowVM;
  actions: Pick<SettingsActions, "change">;
}

/** A numeric setting with its −/+ control. */
export function StepperRow({ vm, actions }: StepperRowProps): JSX.Element {
  return (
    <FormRow title={vm.title} hint={vm.hint}>
      <Stepper
        value={vm.value}
        onStep={(direction) => actions.change(direction === 1 ? vm.increase : vm.decrease)}
      />
    </FormRow>
  );
}
