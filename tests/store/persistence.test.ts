import type { Program } from "@nabd/domain";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import { nov } from "../support/builders";
import { catalogBenchRow, catalogPushPull } from "../support/programs";
import { benchSet, boot, fakeBackend } from "./fixtures";

describe("stored data that cannot be read", () => {
  const goodSet = (id: string) => benchSet(nov(16, 9, 30), { id, planItemId: catalogBenchRow.id });

  it("an unreadable value runs on a default, is reported, and is never saved over", async () => {
    const stored = { nonsense: true };
    const app = await boot({ program: stored, customExercises: "??" });
    expect(app.get().program.days).toEqual([]);
    expect(app.get().customExercises).toEqual([]);
    expect(app.get().loadProblems.map((p) => p.source)).toEqual(["customExercises", "program"]);
    expect(app.get().appNotice).toMatchObject({ kind: "error" });
    expect(app.get().appNotice!.text).toContain("your plan");

    app.get().editProgram((e) => e.addDay(1));
    app.get().startDraft();
    app.get().patchDraft({ name: "Desk Dips", primary: ["triceps"] });
    app.get().saveDraft();
    expect(app.get().program.days).toHaveLength(1);
    expect(app.get().customExercises).toHaveLength(1);
    expect(app.data.program).toEqual(stored);
    expect(app.data.customExercises).toBe("??");
    expect(app.client.save).not.toHaveBeenCalledWith("customExercises", expect.anything());
    expect(app.client.saveMany).not.toHaveBeenCalled();
  });

  it("what could be read keeps saving as usual", async () => {
    const app = await boot({ program: catalogPushPull, customExercises: "??" });
    app.get().editProgram((e) => e.rename("Renamed"));
    expect((app.data.program as Program).name).toBe("Renamed");
  });

  describe("settings are salvaged field by field", () => {
    const stored = { ...DEFAULT_SETTINGS, interval: 30, opacity: 7, equipment: ["sled"] };

    it("one bad field falls back to its default; the others are kept", async () => {
      const app = await boot({ program: catalogPushPull, settings: stored });
      expect(app.get().settings).toEqual({ ...DEFAULT_SETTINGS, interval: 30 });
      expect(app.get().loadProblems).toEqual([]);
      expect(app.get().appNotice).toEqual({
        kind: "info",
        text: "These settings could not be read and are back at their defaults: opacity, equipment.",
      });
    });

    it("what was repaired is written back, and settings go on being saved", async () => {
      const app = await boot({ program: catalogPushPull, settings: stored });
      expect(app.data.settings).toEqual({ ...DEFAULT_SETTINGS, interval: 30 });
      app.get().updateSettings({ minGap: 10 });
      expect(app.data.settings).toEqual({ ...DEFAULT_SETTINGS, interval: 30, minGap: 10 });
    });

    it("the old translucent theme is the dark theme over a glass window", async () => {
      const app = await boot({ settings: { ...DEFAULT_SETTINGS, theme: "translucent" } });
      expect(app.get().settings).toEqual({ ...DEFAULT_SETTINGS, theme: "dark", glass: true });
      expect(app.get().appNotice).toBeNull();
      expect(app.data.settings).toEqual(app.get().settings);
      expect(app.client.setGlass).toHaveBeenCalledWith(true);
    });

    it("settings in order are not written again at boot", async () => {
      const app = await boot({ program: catalogPushPull, settings: DEFAULT_SETTINGS });
      expect(app.savedKeys()).not.toContain("settings");
    });
  });

  it("counts the sets the backend itself could not read", async () => {
    const app = await boot({
      program: catalogPushPull,
      history: [goodSet("a"), { id: 1 }],
      unreadableSets: 2,
    });
    expect(app.get().history.map((set) => set.id)).toEqual(["a"]);
    expect(app.get().loadProblems).toEqual([{ source: "history", detail: "3 sets left out" }]);
  });

  it("an export says that the sets that could not be read are not in it", async () => {
    const app = await boot({
      program: catalogPushPull,
      history: [goodSet("a"), { id: 1 }],
      unreadableSets: 2,
    });
    await app.get().exportData();
    expect(app.get().dataNotice).toEqual({
      kind: "info",
      text: "Exported to memory (nothing is written) — without 3 sets left out that could not be read",
    });
  });

  it("one bad history row is left out without losing the others", async () => {
    const app = await boot({
      program: catalogPushPull,
      history: [goodSet("a"), { id: 1 }, goodSet("b")],
    });
    expect(app.get().history.map((set) => set.id)).toEqual(["a", "b"]);
    expect(app.plan().item(catalogBenchRow.id)!.done).toBe(2);
    expect(app.get().loadProblems).toEqual([{ source: "history", detail: "1 set left out" }]);

    await app.log(catalogBenchRow.id, 1);
    expect(app.client.appendSet).toHaveBeenCalledTimes(1);
  });

  it("a load that fails outright is reported, and nothing is saved over the unread data", async () => {
    const backend = fakeBackend({ program: catalogPushPull });
    backend.client.loadAll = async () => Promise.reject(new Error("database is locked"));
    const app = await boot({}, backend);
    expect(app.get().booted).toBe(true);
    expect(app.get().loadProblems).toEqual([
      { source: "everything", detail: "database is locked" },
    ]);
    expect(app.get().appNotice!.text).toContain("database is locked");

    app.get().editProgram((e) => e.addDay(1));
    app.get().togglePause();
    app.advanceTo(nov(17, 9));
    expect(app.client.save).not.toHaveBeenCalled();
    expect(app.data.program).toEqual(catalogPushPull);
  });

  it("importing a backup replaces the unreadable data and lifts the block", async () => {
    const app = await boot({ program: { nonsense: true } });
    await app.importFile(JSON.stringify({ app: "Nabd", version: 2, program: catalogPushPull }));
    expect(app.get().loadProblems).toEqual([]);
    expect(app.get().appNotice).toBeNull();
    app.get().editProgram((e) => e.rename("Recovered"));
    expect((app.data.program as Program).name).toBe("Recovered");
  });

  it("fresh installs have nothing to report", async () => {
    const app = await boot({});
    expect(app.get().loadProblems).toEqual([]);
    expect(app.get().appNotice).toBeNull();
  });
});

describe("failed saves", () => {
  it("a singleton that cannot be saved is reported app-wide", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.rename("Saved"));
    vi.mocked(app.client.saveMany).mockRejectedValueOnce(new Error("disk full"));
    app.get().editProgram((e) => e.rename("Unsaved"));
    await Promise.resolve();
    await Promise.resolve();
    expect(app.get().appNotice).toEqual({
      kind: "error",
      text: "Could not save your plan: disk full",
    });
  });

  it("the notice outlives the Settings dialog and goes when dismissed", async () => {
    const app = await boot();
    vi.mocked(app.client.appendSet).mockRejectedValueOnce(new Error("disk full"));
    await app.log(catalogBenchRow.id, 1);
    app.get().openSettings();
    app.get().closeSettings();
    expect(app.get().appNotice).not.toBeNull();
    app.get().dismissNotice();
    expect(app.get().appNotice).toBeNull();
  });

  it("an undo that fails leaves the set where it was, and says so", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 1);
    vi.mocked(app.client.deleteSet).mockRejectedValueOnce(new Error("busy"));
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.get().history).toHaveLength(1);
    expect(app.get().appNotice).toEqual({ kind: "error", text: "Could not undo that set: busy" });
  });

  it("an OS call that fails is reported too, never thrown", async () => {
    const app = await boot();
    vi.mocked(app.client.setAutostart).mockRejectedValueOnce(new Error("not permitted"));
    app.get().updateSettings({ openAtStartup: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(app.get().appNotice!.text).toBe("Could not change start at login: not permitted");
  });
});
