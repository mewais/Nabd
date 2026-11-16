import { FormRow, Toggle } from "@nabd/design-system";
import type { SettingsPatch, ToggleRowVM } from "./settings-vm";

interface ToggleRowProps {
  row: ToggleRowVM;
  onChange: (patch: SettingsPatch) => void;
}

/** An on/off setting with its switch. */
export function ToggleRow({ row, onChange }: ToggleRowProps): JSX.Element {
  return (
    <FormRow title={row.title} hint={row.hint}>
      <Toggle on={row.on} onChange={() => onChange(row.flip)} ariaLabel={row.title} />
    </FormRow>
  );
}
