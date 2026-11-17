import { Button, COMMON_WORDS, FormSection, ModalShell, Stack } from "@nabd/design-system";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { NotificationsSection } from "./notifications-section";
import type { SettingsActions } from "./settings-actions";
import type { SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";
import { ToggleRow } from "./toggle-row";
import { TrainingSection } from "./training-section";
import { WorkdaySection } from "./workday-section";
import { WORDS } from "../wording";

interface SettingsModalProps {
  vm: SettingsVM;
  actions: SettingsActions;
}

/** Every setting, grouped; each change is applied at once. */
export function SettingsModal({ vm, actions }: SettingsModalProps): JSX.Element {
  return (
    <ModalShell title={COMMON_WORDS.settings} onClose={actions.close} width="md" layer="modalTop">
      <Stack gap="xxl" paddingX="xxl" paddingY="xl">
        <WorkdaySection vm={vm.workday} actions={actions} />
        <FormSection title={WORDS.nudges}>
          {vm.nudges.map((row) => (
            <StepperRow key={row.title} vm={row} actions={actions} />
          ))}
        </FormSection>
        <TrainingSection vm={vm.training} actions={actions} />
        <AppearanceSection vm={vm.appearance} actions={actions} />
        <FormSection title={WORDS.startup}>
          {vm.startup.map((row) => (
            <ToggleRow key={row.title} vm={row} actions={actions} />
          ))}
        </FormSection>
        <NotificationsSection actions={actions} />
        <DataSection vm={vm.notice} actions={actions} />
        <Button variant="secondary" block onClick={actions.quit}>
          {WORDS.quit}
        </Button>
      </Stack>
    </ModalShell>
  );
}
