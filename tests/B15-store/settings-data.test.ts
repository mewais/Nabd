import { DEFAULT_SETTINGS } from "@nabd/domain";
import { boot, program } from "./harness";

describe("settings and data", () => {
  it("applies valid changes, saves them, and ignores out-of-range ones", async () => {
    const app = await boot();
    app.get().updateSettings({ interval: 30, weightUnit: "lb" });
    expect(app.data.settings).toMatchObject({ interval: 30, weightUnit: "lb" });
    app.get().updateSettings({ interval: 0 });
    app.get().updateSettings({ workStart: 20 * 60 });
    expect(app.get().settings).toMatchObject({ interval: 30, workStart: 9 * 60 });
  });

  it("tells the OS about autostart and translucency changes only", async () => {
    const app = await boot();
    vi.mocked(app.client.setAutostart).mockClear();
    app.get().updateSettings({ interval: 30 });
    expect(app.client.setAutostart).not.toHaveBeenCalled();
    app.get().updateSettings({ openAtStartup: false });
    expect(app.client.setAutostart).toHaveBeenCalledWith(false);
    vi.mocked(app.client.setGlass).mockClear();
    app.get().updateSettings({ glass: true });
    app.get().updateSettings({ opacity: 0.4 });
    app.get().updateSettings({ glass: false });
    // Opacity is the frontend's own paint: only the switch reaches the OS.
    expect(vi.mocked(app.client.setGlass).mock.calls).toEqual([[true], [false]]);
  });

  it("export reports where the file went, or why it failed", async () => {
    const app = await boot();
    vi.mocked(app.client.exportData).mockResolvedValueOnce("/downloads/nabd-data.json");
    await app.get().exportData();
    expect(app.get().notice).toEqual({
      kind: "info",
      text: "Exported to /downloads/nabd-data.json",
    });
    vi.mocked(app.client.exportData).mockRejectedValueOnce(new Error("read-only"));
    await app.get().exportData();
    expect(app.get().notice).toEqual({ kind: "error", text: "Export failed: read-only" });
  });

  it("import validates first, then reloads everything", async () => {
    const app = await boot();
    await app.get().importData("{not json");
    expect(app.get().notice?.kind).toBe("error");
    expect(app.client.importData).not.toHaveBeenCalled();

    const imported = { ...program, name: "Imported plan" };
    await app.get().importData(JSON.stringify({ app: "Nabd", version: 2, program: imported }));
    expect(app.get().program.name).toBe("Imported plan");
    expect(app.get().notice).toEqual({ kind: "info", text: "Import complete." });
  });

  it("an import only changes the settings its file contains", async () => {
    const app = await boot();
    app.get().updateSettings({ weightUnit: "lb", weightIncrement: 5 });
    const file = { app: "Nabd", version: 2, settings: { interval: 30 } };
    await app.get().importData(JSON.stringify(file));
    expect(app.get().settings).toEqual({
      ...DEFAULT_SETTINGS,
      weightUnit: "lb",
      weightIncrement: 5,
      interval: 30,
    });
    expect(app.data.settings).toEqual(app.get().settings);
  });

  it("an import from a newer version of the app is refused", async () => {
    const app = await boot();
    await app.get().importData(JSON.stringify({ app: "Nabd", version: 3, program }));
    expect(app.get().notice).toMatchObject({ kind: "error" });
    expect(app.get().notice!.text).toContain("newer version");
    expect(app.client.importData).not.toHaveBeenCalled();
  });

  it("opening or closing settings clears the last notice", async () => {
    const app = await boot();
    await app.get().exportData();
    app.get().setSettingsOpen(false);
    expect(app.get().notice).toBeNull();
  });
});
