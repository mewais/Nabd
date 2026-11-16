import type { Theme } from "@nabd/domain";
import { FormRow, FormSection, Segmented } from "@nabd/design-system";
import type { SettingsPatch, SettingsVM } from "./settings-vm";
import { StepperRow } from "./stepper-row";
import { ToggleRow } from "./toggle-row";

const THEME_OPTIONS: readonly { k: Theme; label: string }[] = [
  { k: "light", label: "Light" },
  { k: "dark", label: "Dark" },
];

interface AppearanceSectionProps {
  appearance: SettingsVM["appearance"];
  onChange: (patch: SettingsPatch) => void;
}

/** The theme, and the translucent window where the platform offers one. */
export function AppearanceSection({ appearance, onChange }: AppearanceSectionProps): JSX.Element {
  return (
    <FormSection title="Appearance">
      <FormRow title="Theme" hint="Sets text & contrast.">
        <Segmented
          options={THEME_OPTIONS}
          value={appearance.theme}
          onChange={(theme) => onChange({ theme })}
        />
      </FormRow>
      {appearance.glass !== null && <ToggleRow row={appearance.glass} onChange={onChange} />}
      {appearance.opacity !== null && <StepperRow row={appearance.opacity} onChange={onChange} />}
    </FormSection>
  );
}
