import { FormRow, Stepper } from "@nabd/design-system";
import type { SettingsPatch, StepperRowVM } from "./settings-vm";

interface StepperRowProps {
  row: StepperRowVM;
  onChange: (patch: SettingsPatch) => void;
}

/** A numeric setting with its −/+ control. */
export function StepperRow({ row, onChange }: StepperRowProps): JSX.Element {
  return (
    <FormRow title={row.title} hint={row.hint}>
      <Stepper
        value={row.value}
        onDec={() => onChange(row.decrease)}
        onInc={() => onChange(row.increase)}
      />
    </FormRow>
  );
}
