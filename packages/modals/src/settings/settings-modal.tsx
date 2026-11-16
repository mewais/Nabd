import { Button, FormSection, ModalShell, Stack } from "@nabd/design-system";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { NotificationsSection } from "./notifications-section";
import type { SettingsActions } from "./settings-actions";
import type { SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";
import { ToggleRow } from "./toggle-row";
import { TrainingSection } from "./training-section";
import { WorkdaySection } from "./workday-section";

interface SettingsModalProps {
  vm: SettingsVM;
  actions: SettingsActions;
}

/** Every setting, grouped; each change is applied at once. */
export function SettingsModal({ vm, actions }: SettingsModalProps): JSX.Element {
  return (
    <ModalShell title="Settings" onClose={actions.close} width="md" layer="modalTop">
      <Stack gap="xxl" paddingX="xxl" paddingY="xl">
        <WorkdaySection vm={vm.workday} actions={actions} />
        <FormSection title="Nudges">
          {vm.nudges.map((row) => (
            <StepperRow key={row.title} vm={row} actions={actions} />
          ))}
        </FormSection>
        <TrainingSection vm={vm.training} actions={actions} />
        <AppearanceSection vm={vm.appearance} actions={actions} />
        <FormSection title="Startup">
          {vm.startup.map((row) => (
            <ToggleRow key={row.title} vm={row} actions={actions} />
          ))}
        </FormSection>
        <NotificationsSection actions={actions} />
        <DataSection vm={vm.notice} actions={actions} />
        <Button variant="secondary" block onClick={actions.quit}>
          Quit Nabd
        </Button>
      </Stack>
    </ModalShell>
  );
}
