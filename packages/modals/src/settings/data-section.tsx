import { Button, FormSection, Icon } from "@nabd/design-system";
import type { Notice } from "@nabd/view";
import type { SettingsActions } from "./settings-actions";

interface DataSectionProps {
  /** The outcome of the last import or export. */
  vm: Notice | null;
  actions: Pick<SettingsActions, "exportData" | "importData">;
}

/** Back up everything to a file, or load a backup; the outcome is reported underneath. */
export function DataSection({ vm, actions }: DataSectionProps): JSX.Element {
  return (
    <FormSection title="Data">
      <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
        <Button variant="secondary" onClick={actions.exportData} style={{ flex: 1 }}>
          <Icon name="download" size={15} />
          Export data
        </Button>
        <Button variant="secondary" onClick={actions.importData} style={{ flex: 1 }}>
          <Icon name="upload" size={15} />
          Import data
        </Button>
      </div>
      {vm !== null && (
        <div
          role="status"
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: vm.kind === "error" ? "var(--accent)" : "var(--text2)",
            wordBreak: "break-word",
          }}
        >
          {vm.text}
        </div>
      )}
    </FormSection>
  );
}
