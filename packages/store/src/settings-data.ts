import type { Notice } from "@nabd/domain";
import { SettingsSchema, hasWorkday, plural, withWeightUnit } from "@nabd/domain";
import { parseImport } from "@nabd/serialization";
import type { SettingsDataActions } from "./actions";
import type { StoreContext } from "./context";
import { applyAutostart, applyGlass } from "./desktop";
import { errorText } from "./persistence";

export function settingsDataActions(ctx: StoreContext): SettingsDataActions {
  const { get, set, client, save, flushSets } = ctx;

  /** The outcome of an import or export, shown in Settings where it was asked for. */
  const report = (kind: Notice["kind"], text: string): void => set({ notice: { kind, text } });

  return {
    updateSettings: (patch) => {
      const before = get().settings;
      // A change of unit alone takes the weight increment along (see withWeightUnit).
      const base =
        patch.weightUnit !== undefined && patch.weightIncrement === undefined
          ? withWeightUnit(before, patch.weightUnit)
          : before;
      const parsed = SettingsSchema.safeParse({ ...base, ...patch });
      // An out-of-range value (a stepper pushed past its bound) is simply not applied.
      if (!parsed.success || !hasWorkday(parsed.data)) return;
      const settings = parsed.data;
      save("settings", settings);
      if (settings.openAtStartup !== before.openAtStartup) {
        applyAutostart(ctx, settings.openAtStartup);
      }
      if (settings.glass !== before.glass) applyGlass(ctx, settings.glass);
    },

    exportData: async () => {
      const complete = await flushSets();
      try {
        const path = await client.exportData("manual");
        const missing = plural(get().unsavedSets.length, "set");
        report(
          "info",
          `Exported to ${path}${complete ? "" : ` — without ${missing} not saved yet`}`,
        );
      } catch (e) {
        report("error", `Export failed: ${errorText(e)}`);
      }
    },

    importData: (json) => {
      const result = parseImport(json);
      if (result.ok) set({ confirmation: { kind: "import", data: result.data } });
      else report("error", `Import failed — ${result.errors[0]}`);
    },

    replaceData: async (imported) => {
      // The file replaces what it contains; settings it does not mention keep their values.
      const { settings } = imported;
      const data = settings
        ? { ...imported, settings: { ...get().settings, ...settings } }
        : imported;
      // What the import replaces is kept: saved in full, then written to a backup file.
      if (!(await flushSets())) {
        report("error", "Import failed: some logged sets are not saved yet. Try again shortly.");
        return;
      }
      try {
        const backup = await client.exportData("before_import");
        await client.importData(data);
        await get().hydrate();
        report("info", `Import complete. What it replaced was first saved to ${backup}`);
      } catch (e) {
        report("error", `Import failed: ${errorText(e)}`);
      }
    },
  };
}
