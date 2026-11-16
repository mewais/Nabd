import { Button, FormSection, Icon, Row, Stack, Text } from "@nabd/design-system";
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
      <Stack gap="sm">
        <Row gap="sm">
          <Button variant="secondary" onClick={actions.exportData} grow>
            <Icon name="download" />
            Export data
          </Button>
          <Button variant="secondary" onClick={actions.importData} grow>
            <Icon name="upload" />
            Import data
          </Button>
        </Row>
        {vm !== null && (
          <Text
            role="status"
            variant="hint"
            tone={vm.kind === "error" ? "accent" : "muted"}
            breakWords
          >
            {vm.text}
          </Text>
        )}
      </Stack>
    </FormSection>
  );
}
