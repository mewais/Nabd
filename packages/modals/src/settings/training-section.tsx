import { ChipGroup, FormRow, FormSection, Segmented } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import { toggled } from "@nabd/domain";
import type { WeightUnit } from "@nabd/domain";
import { EQUIPMENT_OPTIONS } from "../equipment-options";
import type { SettingsPatch, SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";

const UNIT_OPTIONS: readonly SegOption<WeightUnit>[] = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];

interface TrainingSectionProps {
  training: SettingsVM["training"];
  onChange: (patch: SettingsPatch) => void;
}

/** How loads are shown and stepped, and what equipment the library may offer. */
export function TrainingSection({ training, onChange }: TrainingSectionProps): JSX.Element {
  return (
    <FormSection title="Training">
      <FormRow title="Weight unit" hint="Show and enter weights in this unit.">
        <Segmented
          options={UNIT_OPTIONS}
          value={training.unit}
          onChange={(weightUnit) => onChange({ weightUnit })}
        />
      </FormRow>
      <StepperRow row={training.increment} onChange={onChange} />
      <FormRow
        stacked
        title="My equipment"
        hint="The exercise library only offers what you can do with these."
      >
        <ChipGroup
          options={EQUIPMENT_OPTIONS}
          selected={training.equipment}
          onToggle={(key) => onChange({ equipment: toggled(training.equipment, key) })}
        />
      </FormRow>
    </FormSection>
  );
}
