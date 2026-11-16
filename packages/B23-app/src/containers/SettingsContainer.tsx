import { useMemo } from "react";
import { SettingsModal, buildSettingsVM } from "@nabd/modals";
import type { SettingsActions } from "@nabd/modals";
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
  const store = useActions();
  const open = useNabd((s) => s.settingsOpen);
  const settings = useNabd((s) => s.settings);
  const notice = useNabd((s) => s.notice);
  const capabilities = useNabd((s) => s.capabilities);

  const vm = useMemo(
    () => buildSettingsVM({ settings, capabilities, notice }),
    [settings, capabilities, notice],
  );
  const actions = useMemo(
    (): SettingsActions => ({
      change: store.updateSettings,
      exportData: () => void store.exportData(),
      importData: () => pickJsonFile((text) => void store.importData(text)),
      sendTestNotification: store.sendTestNotification,
      quit: store.quit,
      close: () => store.setSettingsOpen(false),
    }),
    [store],
  );

  return open ? <SettingsModal vm={vm} actions={actions} /> : null;
}
