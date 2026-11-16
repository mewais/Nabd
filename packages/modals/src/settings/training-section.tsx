import { FormRow, FormSection, NumberField, Segmented } from "@nabd/design-system";
import { WEIGHT_UNIT_OPTIONS } from "../options";
import { ChipsRow } from "./chips-row";
import type { SettingsActions } from "./settings-actions";
import { StepperRow } from "./stepper-row";
import type { TrainingVM } from "./training-vm";

interface TrainingSectionProps {
  vm: TrainingVM;
  actions: Pick<SettingsActions, "change" | "setBodyWeight">;
}

/** How loads are shown and stepped, the user's body weight, and what equipment the library may offer. */
export function TrainingSection({ vm, actions }: TrainingSectionProps): JSX.Element {
  return (
    <FormSection title="Training">
      <FormRow title="Weight unit" hint="Show and enter weights in this unit.">
        <Segmented
          options={WEIGHT_UNIT_OPTIONS}
          value={vm.unit}
          onChange={(weightUnit) => actions.change({ weightUnit })}
        />
      </FormRow>
      <StepperRow vm={vm.increment} actions={actions} />
      <FormRow title="Body weight" hint={vm.bodyWeight.hint}>
        <NumberField
          ariaLabel="Body weight"
          placeholder={vm.unit}
          value={vm.bodyWeight.value}
          onSet={actions.setBodyWeight}
          onClear={() => actions.setBodyWeight(null)}
        />
      </FormRow>
      <ChipsRow vm={vm.equipment} actions={actions} />
    </FormSection>
  );
}
