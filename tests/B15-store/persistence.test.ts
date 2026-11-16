import type { Program } from "@nabd/domain";
import { DEFAULT_SETTINGS } from "@nabd/domain";
import { nov } from "../support/domain-factories";
import { benchRow, benchSet, boot, fakeBackend, program } from "./harness";

describe("stored data that cannot be read", () => {
  const goodSet = (id: string) => benchSet(nov(16, 9, 30), { id, planItemId: benchRow.id });

  it("an unreadable value runs on a default, is reported, and is never saved over", async () => {
    const stored = { nonsense: true };
    const app = await boot({ program: stored, settings: "??" });
    expect(app.get().program.days).toEqual([]);
    expect(app.get().settings).toEqual(DEFAULT_SETTINGS);
    expect(app.get().loadProblems.map((p) => p.source)).toEqual(["settings", "program"]);
    expect(app.get().appNotice).toMatchObject({ kind: "error" });
    expect(app.get().appNotice!.text).toContain("your plan");

    app.get().editProgram((e) => e.addDay(1));
    app.get().updateSettings({ interval: 30 });
    expect(app.get().program.days).toHaveLength(1);
    expect(app.data.program).toEqual(stored);
    expect(app.data.settings).toBe("??");
    expect(app.savedKeys()).not.toContain("program");
    expect(app.savedKeys()).not.toContain("settings");
  });

  it("what could be read keeps saving as usual", async () => {
    const app = await boot({ program, settings: "??" });
    app.get().editProgram((e) => e.rename("Renamed"));
    expect((app.data.program as Program).name).toBe("Renamed");
  });

  it("one bad history row is left out without losing the others", async () => {
    const app = await boot({ program, history: [goodSet("a"), { id: 1 }, goodSet("b")] });
    expect(app.get().history.map((set) => set.id)).toEqual(["a", "b"]);
    expect(app.plan().item(benchRow.id)!.done).toBe(2);
    expect(app.get().loadProblems).toEqual([{ source: "history", detail: "1 set left out" }]);

    await app.log(benchRow.id, 1);
    expect(app.client.appendSet).toHaveBeenCalledTimes(1);
  });

  it("a load that fails outright is reported, and nothing is saved over the unread data", async () => {
    const backend = fakeBackend({ program });
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
    expect(app.data.program).toEqual(program);
  });

  it("importing a backup replaces the unreadable data and lifts the block", async () => {
    const app = await boot({ program: { nonsense: true } });
    await app.get().importData(JSON.stringify({ app: "Nabd", version: 2, program }));
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
    vi.mocked(app.client.save).mockRejectedValueOnce(new Error("disk full"));
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
    await app.log(benchRow.id, 1);
    app.get().setSettingsOpen(true);
    app.get().setSettingsOpen(false);
    expect(app.get().appNotice).not.toBeNull();
    app.get().dismissNotice();
    expect(app.get().appNotice).toBeNull();
  });

  it("an undo that fails leaves the set where it was, and says so", async () => {
    const app = await boot();
    await app.log(benchRow.id, 1);
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
