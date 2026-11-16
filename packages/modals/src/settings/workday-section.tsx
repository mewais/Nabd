import { FormSection } from "@nabd/design-system";
import { ChipsRow } from "./chips-row";
import type { SettingsActions } from "./settings-actions";
import { StepperRow } from "./stepper-row";
import type { WorkdayVM } from "./workday-vm";

interface WorkdaySectionProps {
  vm: WorkdayVM;
  actions: Pick<SettingsActions, "change">;
}

/** The hours Nabd nudges in, and the weekdays it does so on. */
export function WorkdaySection({ vm, actions }: WorkdaySectionProps): JSX.Element {
  return (
    <FormSection title="Workday">
      {vm.hours.map((row) => (
        <StepperRow key={row.title} vm={row} actions={actions} />
      ))}
      <ChipsRow vm={vm.days} actions={actions} />
    </FormSection>
  );
}
