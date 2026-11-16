import { SettingsModal } from "@nabd/modals";
import { useActions, useNabd } from "../store-context";

/** Ask the user for a JSON file and hand its text to `onText`. */
function pickJsonFile(onText: (text: string) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    void input.files?.[0]?.text().then(onText);
  };
  input.click();
}

export function SettingsContainer(): JSX.Element | null {
  const actions = useActions();
  const open = useNabd((s) => s.settingsOpen);
  const settings = useNabd((s) => s.settings);
  const notice = useNabd((s) => s.notice);
  const glassAvailable = useNabd((s) => s.capabilities.glass);
  if (!open) return null;

  return (
    <SettingsModal
      settings={settings}
      notice={notice}
      onChange={actions.updateSettings}
      onExport={() => void actions.exportData()}
      onImport={() => pickJsonFile((text) => void actions.importData(text))}
      onClose={() => actions.setSettingsOpen(false)}
      glassAvailable={glassAvailable}
      onTestNotification={actions.sendTestNotification}
      onQuit={actions.quit}
    />
  );
}
