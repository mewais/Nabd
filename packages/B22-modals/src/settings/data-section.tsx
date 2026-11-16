import { Button, FormSection, Icon } from "@nabd/design-system";
import type { NoticeVM } from "./settings-vm";

interface DataSectionProps {
  notice: NoticeVM | null;
  onExport: () => void;
  onImport: () => void;
}

/** Back up everything to a file, or load a backup; the outcome is reported underneath. */
export function DataSection({ notice, onExport, onImport }: DataSectionProps): JSX.Element {
  return (
    <FormSection title="Data">
      <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
        <Button variant="secondary" onClick={onExport} style={{ flex: 1 }}>
          <Icon name="download" size={15} />
          Export data
        </Button>
        <Button variant="secondary" onClick={onImport} style={{ flex: 1 }}>
          <Icon name="upload" size={15} />
          Import data
        </Button>
      </div>
      {notice !== null && (
        <div
          role="status"
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: notice.failed ? "var(--accent)" : "var(--text2)",
            wordBreak: "break-word",
          }}
        >
          {notice.text}
        </div>
      )}
    </FormSection>
  );
}
