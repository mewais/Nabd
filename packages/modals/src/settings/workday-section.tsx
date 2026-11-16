import { ChipGroup, FormRow, FormSection } from "@nabd/design-system";
import { toggled } from "@nabd/domain";
import { WEEKDAY_OPTIONS } from "../options";
import type { SettingsActions } from "./settings-actions";
import type { SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";

interface WorkdaySectionProps {
  vm: SettingsVM["workday"];
  actions: Pick<SettingsActions, "change">;
}

/** The hours Nabd nudges in, and the weekdays it does so on. */
export function WorkdaySection({ vm, actions }: WorkdaySectionProps): JSX.Element {
  return (
    <FormSection title="Workday">
      {vm.hours.map((row) => (
        <StepperRow key={row.title} vm={row} actions={actions} />
      ))}
      <FormRow
        stacked
        title="Working days"
        hint="Nabd stays quiet on the others, though you can still log. At least one stays on."
      >
        <ChipGroup
          options={WEEKDAY_OPTIONS}
          selected={vm.days.map(String)}
          onToggle={(day) => actions.change({ workDays: toggled(vm.days, Number(day)) })}
        />
      </FormRow>
    </FormSection>
  );
}
