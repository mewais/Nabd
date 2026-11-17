import { SettingsModal, buildSettingsVM } from "@nabd/modals";
import type { SettingsActions } from "@nabd/modals";
import type { NabdActions } from "@nabd/store";
import { pickJsonFile } from "../pick-file";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): SettingsActions => ({
  change: store.updateSettings,
  setBodyWeight: store.setBodyWeight,
  exportData: () => void store.exportData(),
  importData: () => pickJsonFile(store.importData),
  sendTestNotification: store.sendTestNotification,
  quit: store.quit,
  close: store.closeSettings,
});

/** The Settings dialog, while it is open. */
export function SettingsContainer(): JSX.Element | null {
  const open = useNabd((s) => s.settingsOpen);
  const settings = useNabd((s) => s.settings);
  const notice = useNabd((s) => s.dataNotice);
  const capabilities = useNabd((s) => s.capabilities);
  const vm = useViewModel(buildSettingsVM, { settings, capabilities, notice });
  const actions = useBoundActions(bind);
  return open ? <SettingsModal vm={vm} actions={actions} /> : null;
}
