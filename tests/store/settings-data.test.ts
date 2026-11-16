import { APPDATA_VERSION, DEFAULT_SETTINGS } from "@nabd/domain";
import { catalogBenchRow, catalogPushPull } from "../support/programs";
import { boot } from "./fixtures";

describe("settings and data", () => {
  it("applies valid changes, saves them, and ignores out-of-range ones", async () => {
    const app = await boot();
    app.get().updateSettings({ interval: 30, minGap: 10 });
    expect(app.data.settings).toMatchObject({ interval: 30, minGap: 10 });
    app.get().updateSettings({ interval: 0 });
    app.get().updateSettings({ workStart: 20 * 60 });
    expect(app.get().settings).toMatchObject({ interval: 30, workStart: 9 * 60 });
  });

  it("a change of unit takes the usual weight increment along, and leaves a chosen one alone", async () => {
    const app = await boot();
    app.get().updateSettings({ weightUnit: "lb" });
    expect(app.get().settings).toMatchObject({ weightUnit: "lb", weightIncrement: 5 });
    app.get().updateSettings({ weightUnit: "kg" });
    expect(app.get().settings).toMatchObject({ weightUnit: "kg", weightIncrement: 2.5 });

    app.get().updateSettings({ weightIncrement: 1.25 });
    app.get().updateSettings({ weightUnit: "lb" });
    expect(app.get().settings).toMatchObject({ weightUnit: "lb", weightIncrement: 1.25 });
    // A unit and an increment given together are taken as given.
    app.get().updateSettings({ weightUnit: "kg", weightIncrement: 5 });
    expect(app.get().settings).toMatchObject({ weightUnit: "kg", weightIncrement: 5 });
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
    expect(app.get().dataNotice).toEqual({
      kind: "info",
      text: "Exported to /downloads/nabd-data.json",
    });
    vi.mocked(app.client.exportData).mockRejectedValueOnce(new Error("read-only"));
    await app.get().exportData();
    expect(app.get().dataNotice).toEqual({ kind: "error", text: "Could not export: read-only" });
  });

  it("import validates first, then reloads everything", async () => {
    const app = await boot();
    await app.importFile("{not json");
    expect(app.get().dataNotice?.kind).toBe("error");
    expect(app.client.importData).not.toHaveBeenCalled();

    const imported = { ...catalogPushPull, name: "Imported plan" };
    vi.mocked(app.client.exportData).mockResolvedValueOnce("/downloads/nabd-backup.json");
    await app.importFile(JSON.stringify({ app: "Nabd", version: 2, program: imported }));
    expect(app.get().program.name).toBe("Imported plan");
    expect(app.get().dataNotice).toEqual({
      kind: "info",
      text: "Import complete. What it replaced was first saved to /downloads/nabd-backup.json",
    });
  });

  it("an import first backs up what it is about to replace, and is called off if it cannot", async () => {
    const app = await boot();
    const file = JSON.stringify({
      app: "Nabd",
      version: 2,
      program: { ...catalogPushPull, name: "New" },
    });
    await app.importFile(file);
    expect(app.client.exportData).toHaveBeenCalledWith("before_import");
    const [backedUp] = vi.mocked(app.client.exportData).mock.invocationCallOrder;
    const [imported] = vi.mocked(app.client.importData).mock.invocationCallOrder;
    expect(backedUp).toBeLessThan(imported!);

    const blocked = await boot();
    vi.mocked(blocked.client.exportData).mockRejectedValueOnce(new Error("read-only"));
    await blocked.importFile(file);
    expect(blocked.client.importData).not.toHaveBeenCalled();
    expect(blocked.get().program.name).toBe(catalogPushPull.name);
    expect(blocked.get().dataNotice).toEqual({
      kind: "error",
      text: "Could not import: read-only",
    });
  });

  it("an import waits for the sets that are not saved yet, rather than lose them", async () => {
    const app = await boot();
    vi.mocked(app.client.appendSet).mockRejectedValue(new Error("disk full"));
    await app.log(catalogBenchRow.id, 1);
    await app.importFile(JSON.stringify({ app: "Nabd", version: 2, program: catalogPushPull }));
    expect(app.client.importData).not.toHaveBeenCalled();
    expect(app.get().history).toHaveLength(1);
    expect(app.get().dataNotice).toEqual({
      kind: "error",
      text: "Could not import: some logged sets are not saved yet. Try again shortly.",
    });
  });

  it("an import reads an early build's translucent theme", async () => {
    const app = await boot();
    await app.importFile(JSON.stringify({ app: "Nabd", version: 1, theme: "translucent" }));
    expect(app.get().settings).toMatchObject({ theme: "dark", glass: true });
  });

  it("an import only changes the settings its file contains", async () => {
    const app = await boot();
    app.get().updateSettings({ weightUnit: "lb", weightIncrement: 5 });
    const file = { app: "Nabd", version: 2, settings: { interval: 30 } };
    await app.importFile(JSON.stringify(file));
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
    await app.importFile(
      JSON.stringify({ app: "Nabd", version: APPDATA_VERSION + 1, program: catalogPushPull }),
    );
    expect(app.get().dataNotice).toMatchObject({ kind: "error" });
    expect(app.get().dataNotice!.text).toContain("newer version");
    expect(app.client.importData).not.toHaveBeenCalled();
  });

  it("opening or closing settings clears the last notice", async () => {
    const app = await boot();
    await app.get().exportData();
    app.get().closeSettings();
    expect(app.get().dataNotice).toBeNull();
  });
});
