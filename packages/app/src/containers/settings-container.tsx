import { useMemo } from "react";
import { SettingsModal, buildSettingsVM } from "@nabd/modals";
import type { SettingsActions } from "@nabd/modals";
import { pickJsonFile } from "../pick-file";
import { useActions, useNabd } from "../store-context";

/** The Settings dialog, while it is open. */
export function SettingsContainer(): JSX.Element | null {
  const store = useActions();
  const open = useNabd((s) => s.settingsOpen);
  const settings = useNabd((s) => s.settings);
  const notice = useNabd((s) => s.dataNotice);
  const capabilities = useNabd((s) => s.capabilities);

  const vm = useMemo(
    () => buildSettingsVM({ settings, capabilities, notice }),
    [settings, capabilities, notice],
  );
  const actions = useMemo(
    (): SettingsActions => ({
      change: store.updateSettings,
      setBodyWeight: store.setBodyWeight,
      exportData: () => void store.exportData(),
      importData: () => pickJsonFile(store.importData),
      sendTestNotification: store.sendTestNotification,
      quit: store.quit,
      close: store.closeSettings,
    }),
    [store],
  );

  return open ? <SettingsModal vm={vm} actions={actions} /> : null;
}
