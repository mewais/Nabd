import { nov } from "../support/builders";
import { catalogBenchRow } from "../support/programs";
import { boot } from "./fixtures";
describe("a set that could not be saved", () => {
  const failOnce = async () => {
    const app = await boot();
    vi.mocked(app.client.appendSet).mockRejectedValueOnce(new Error("disk full"));
    await app.log(catalogBenchRow.id, 1);
    return app;
  };

  it("stays on screen, is marked as waiting, and the user is told it will be retried", async () => {
    const app = await failOnce();
    const [set] = app.get().history;
    expect(app.get().unsavedSets).toEqual([set!.id]);
    expect(app.data.history).toEqual([]);
    expect(app.get().appNotice).toEqual({
      kind: "error",
      text:
        "Could not save that set: disk full. It is kept, marked as not saved yet, " +
        "and will be saved as soon as that works again.",
    });
  });

  it("is saved on the next beat of the clock", async () => {
    const app = await failOnce();
    app.advanceTo(nov(16, 10, 1));
    await vi.waitFor(() => expect(app.get().unsavedSets).toEqual([]));
    expect(app.data.history).toEqual(app.get().history);
    expect(app.get().appNotice).toEqual({
      kind: "info",
      text: "The sets that were waiting are saved now.",
    });
  });

  it("is saved after the next backend call that works", async () => {
    const app = await failOnce();
    app.get().togglePause();
    await vi.waitFor(() => expect(app.data.history).toEqual(app.get().history));
    expect(app.get().unsavedSets).toEqual([]);
  });

  it("keeps waiting, quietly, for as long as saving keeps failing", async () => {
    const app = await failOnce();
    vi.mocked(app.client.appendSet).mockRejectedValue(new Error("disk full"));
    app.get().dismissNotice();
    app.advanceTo(nov(16, 10, 1));
    app.advanceTo(nov(16, 10, 2));
    await Promise.resolve();
    expect(app.get().unsavedSets).toHaveLength(1);
    expect(app.get().appNotice).toBeNull();
  });

  it("is saved before an export, which otherwise says what it is missing", async () => {
    const app = await failOnce();
    await app.get().exportData();
    expect(app.data.history).toEqual(app.get().history);
    expect(app.get().dataNotice!.text).toBe("Exported to memory (nothing is written)");

    const stuck = await failOnce();
    vi.mocked(stuck.client.appendSet).mockRejectedValue(new Error("disk full"));
    await stuck.get().exportData();
    expect(stuck.get().dataNotice!.text).toBe(
      "Exported to memory (nothing is written) — without 1 set not saved yet",
    );
  });

  it("is saved before quitting", async () => {
    const app = await failOnce();
    app.get().quit();
    await vi.waitFor(() => expect(app.client.quit).toHaveBeenCalledTimes(1));
    expect(app.data.history).toEqual(app.get().history);
  });

  it("undone before it was saved, it is simply dropped and never reaches the backend", async () => {
    const app = await failOnce();
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.get().history).toEqual([]);
    expect(app.client.deleteSet).not.toHaveBeenCalled();
    app.advanceTo(nov(16, 10, 1));
    await vi.waitFor(() => expect(app.get().unsavedSets).toEqual([]));
    expect(app.data.history).toEqual([]);
  });
});

describe("a set being saved", () => {
  /** Log one set that the backend takes only once `release` is called. */
  const logHeld = async () => {
    const app = await boot();
    let release = (): void => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.mocked(app.client.appendSet).mockImplementationOnce(async (set) => {
      await held;
      app.data.history.push(set);
    });
    const logging = app.log(catalogBenchRow.id, 1);
    return { app, release, logging };
  };

  it("is marked as not saved yet from the moment it is logged until the backend has it", async () => {
    const { app, release, logging } = await logHeld();
    const [set] = app.get().history;
    expect(app.get().unsavedSets).toEqual([set!.id]);

    release();
    await logging;
    expect(app.get().unsavedSets).toEqual([]);
    expect(app.data.history).toEqual([set]);
    expect(app.get().appNotice).toBeNull();
  });

  it("is saved before quitting, however long the backend takes", async () => {
    const { app, release } = await logHeld();
    app.get().quit();
    await new Promise((resolve) => setTimeout(resolve));
    expect(app.client.quit).not.toHaveBeenCalled();

    release();
    await vi.waitFor(() => expect(app.client.quit).toHaveBeenCalledTimes(1));
    expect(app.data.history).toEqual(app.get().history);
  });

  it("undone before the backend has it, it is taken back out once it gets there", async () => {
    const { app, release, logging } = await logHeld();
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.get().history).toEqual([]);

    release();
    await logging;
    await vi.waitFor(() => expect(app.data.history).toEqual([]));
  });
});
