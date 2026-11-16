import { COMMON_WORDS, FormRow, FormSection, Segmented, THEME_OPTIONS } from "@nabd/design-system";
import type { SettingsActions } from "./settings-actions";
import type { SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";
import { ToggleRow } from "./toggle-row";
import { WORDS } from "../wording";

interface AppearanceSectionProps {
  vm: SettingsVM["appearance"];
  actions: Pick<SettingsActions, "change">;
}

/** The theme, and the translucent window where the platform offers one. */
export function AppearanceSection({ vm, actions }: AppearanceSectionProps): JSX.Element {
  return (
    <FormSection title={WORDS.appearance}>
      <FormRow title={COMMON_WORDS.theme} hint={WORDS.themeHint}>
        <Segmented
          options={THEME_OPTIONS}
          value={vm.theme}
          onChange={(theme) => actions.change({ theme })}
        />
      </FormRow>
      {vm.glass !== null && <ToggleRow vm={vm.glass} actions={actions} />}
      {vm.opacity !== null && <StepperRow vm={vm.opacity} actions={actions} />}
    </FormSection>
  );
}
