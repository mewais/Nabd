import {
  SettingsSchema,
  hasWorkingHours,
  kgFromDisplay,
  plural,
  withWeightUnit,
} from "@nabd/domain";
import { parseImport } from "@nabd/serialization";
import type { StoreContext } from "./context";
import { applyAutostart, applyGlass } from "./os";
import type { SettingsDataSlice } from "./slices";

/** The settings and the data behind them: the Settings dialog's side of the store. */
export function settingsDataSlice(ctx: StoreContext): SettingsDataSlice {
  const { get, set, client, save, flushSets, attempt, notify } = ctx;

  /** What an export leaves out, for the notice that reports it; empty when it is complete. */
  function exportGaps(allSaved: boolean): string {
    const unsaved = allSaved ? [] : [`${plural(get().unsavedSets.length, "set")} not saved yet`];
    const unreadable = get()
      .loadProblems.filter((problem) => problem.source === "history")
      .map((problem) => `${problem.detail} that could not be read`);
    const gaps = [...unsaved, ...unreadable];
    return gaps.length === 0 ? "" : ` — without ${gaps.join(", or ")}`;
  }

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
      if (!parsed.success || !hasWorkingHours(parsed.data)) return;
      const settings = parsed.data;
      save("settings", settings);
      if (settings.openAtStartup !== before.openAtStartup) {
        applyAutostart(ctx, settings.openAtStartup);
      }
      if (settings.glass !== before.glass) applyGlass(ctx, settings.glass);
    },

    setBodyWeight: (displayValue) => {
      const unit = get().settings.weightUnit;
      const bodyWeight = displayValue === null ? null : kgFromDisplay(displayValue, unit);
      get().updateSettings({ bodyWeight });
    },

    openSettings: () => set({ settingsOpen: true }),
    // The import/export notice belongs to one visit of the Settings dialog.
    closeSettings: () => set({ settingsOpen: false, dataNotice: null }),

    exportData: async () => {
      const allSaved = await flushSets();
      const exported = await attempt("export", () => client.exportData("manual"), "dataNotice");
      if (!exported.ok) return;
      notify("info", `Exported to ${exported.value}${exportGaps(allSaved)}`, "dataNotice");
    },

    importData: (json) => {
      const result = parseImport(json);
      if (result.ok) set({ confirmation: { kind: "import", data: result.data } });
      else notify("error", `Could not import: ${result.errors[0]}`, "dataNotice");
    },

    replaceData: async (imported) => {
      // The file replaces what it contains; settings it does not mention keep their values.
      const { settings } = imported;
      const data = settings
        ? { ...imported, settings: { ...get().settings, ...settings } }
        : imported;
      // What the import replaces is kept: saved in full, then written to a backup file.
      if (!(await flushSets())) {
        const why = "some logged sets are not saved yet. Try again shortly.";
        notify("error", `Could not import: ${why}`, "dataNotice");
        return;
      }
      const imports = await attempt(
        "import",
        async () => {
          const backup = await client.exportData("before_import");
          await client.importData(data);
          return backup;
        },
        "dataNotice",
      );
      if (!imports.ok) return;
      await get().hydrate();
      notify(
        "info",
        `Import complete. What it replaced was first saved to ${imports.value}`,
        "dataNotice",
      );
    },
  };
}
