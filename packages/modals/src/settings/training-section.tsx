import { ChipGroup, FormRow, FormSection, Segmented } from "@nabd/design-system";
import { toggled } from "@nabd/domain";
import { EQUIPMENT_OPTIONS, WEIGHT_UNIT_OPTIONS } from "../options";
import type { SettingsActions } from "./settings-actions";
import type { SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";

interface TrainingSectionProps {
  vm: SettingsVM["training"];
  actions: Pick<SettingsActions, "change">;
}

/** How loads are shown and stepped, and what equipment the library may offer. */
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
      <FormRow
        stacked
        title="My equipment"
        hint="The exercise library only offers what you can do with these."
      >
        <ChipGroup
          options={EQUIPMENT_OPTIONS}
          selected={vm.equipment}
          onToggle={(key) => actions.change({ equipment: toggled(vm.equipment, key) })}
        />
      </FormRow>
    </FormSection>
  );
}
