import type { Notice } from "@nabd/domain";
import { SettingsSchema } from "@nabd/domain";
import { parseImport } from "@nabd/serialization";
import type { SettingsDataActions } from "./actions";
import type { StoreContext } from "./context";
import { applyAutostart, applyGlass } from "./desktop";
import { errorText } from "./persistence";

export function settingsDataActions(ctx: StoreContext): SettingsDataActions {
  const { get, set, client, save } = ctx;

  /** The outcome of an import or export, shown in Settings where it was asked for. */
  const report = (kind: Notice["kind"], text: string): void => set({ notice: { kind, text } });

  return {
    updateSettings: (patch) => {
      const before = get().settings;
      const parsed = SettingsSchema.safeParse({ ...before, ...patch });
      // An out-of-range value (a stepper pushed past its bound) is simply not applied.
      if (!parsed.success || parsed.data.workStart >= parsed.data.workEnd) return;
      const settings = parsed.data;
      save("settings", settings);
      if (settings.openAtStartup !== before.openAtStartup) {
        applyAutostart(ctx, settings.openAtStartup);
      }
      if (settings.glass !== before.glass) applyGlass(ctx, settings.glass);
    },

    exportData: async () => {
      try {
        report("info", `Exported to ${await client.exportData()}`);
      } catch (e) {
        report("error", `Export failed: ${errorText(e)}`);
      }
    },

    importData: async (json) => {
      const result = parseImport(json);
      if (!result.ok) {
        report("error", `Import failed — ${result.errors[0]}`);
        return;
      }
      // The file replaces what it contains; settings it does not mention keep their values.
      const { settings } = result.data;
      const data = settings
        ? { ...result.data, settings: { ...get().settings, ...settings } }
        : result.data;
      try {
        await client.importData(data);
        await get().hydrate();
        report("info", "Import complete.");
      } catch (e) {
        report("error", `Import failed: ${errorText(e)}`);
      }
    },
  };
}
