import { Button, FormSection, ModalShell } from "@nabd/design-system";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { NotificationsSection } from "./notifications-section";
import type { SettingsActions } from "./settings-actions";
import type { SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";
import { ToggleRow } from "./toggle-row";
import { TrainingSection } from "./training-section";

export interface SettingsModalProps {
  vm: SettingsVM;
  actions: SettingsActions;
}

/** Every setting, grouped; each change is applied at once. */
export function SettingsModal({ vm, actions }: SettingsModalProps): JSX.Element {
  const { change } = actions;
  return (
    <ModalShell title="Settings" onClose={actions.close} width={540} layer="modalTop">
      <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "18px 22px 22px" }}>
        <FormSection title="Workday">
          {vm.workday.map((row) => (
            <StepperRow key={row.title} row={row} onChange={change} />
          ))}
        </FormSection>
        <FormSection title="Nudges">
          {vm.nudges.map((row) => (
            <StepperRow key={row.title} row={row} onChange={change} />
          ))}
        </FormSection>
        <TrainingSection training={vm.training} onChange={change} />
        <AppearanceSection appearance={vm.appearance} onChange={change} />
        <FormSection title="Startup">
          {vm.startup.map((row) => (
            <ToggleRow key={row.title} row={row} onChange={change} />
          ))}
        </FormSection>
        <NotificationsSection onTest={actions.sendTestNotification} />
        <DataSection
          notice={vm.notice}
          onExport={actions.exportData}
          onImport={actions.importData}
        />
        <Button variant="secondary" block onClick={actions.quit}>
          Quit Nabd
        </Button>
      </div>
    </ModalShell>
  );
}
