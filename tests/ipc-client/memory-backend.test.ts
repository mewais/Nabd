import { DEFAULT_SETTINGS, EMPTY_PROGRAM } from "@nabd/domain";
import { createMemoryBackend } from "@nabd/ipc-client";
import { exercise, logged, nov } from "../support/builders";

describe("the in-memory backend", () => {
  it("starts with nothing saved, like a fresh install", async () => {
    const { client } = createMemoryBackend();
    expect(await client.loadAll()).toEqual({
      program: null,
      settings: null,
      customExercises: null,
      rotationState: null,
      dayState: null,
      dayLog: null,
      history: [],
    });
    expect(await client.platformCapabilities()).toEqual({ tray: false, glass: false, idle: false });
  });

  it("keeps what is saved, one value or several at once", async () => {
    const { client, data } = createMemoryBackend();
    await client.save("settings", DEFAULT_SETTINGS);
    await client.saveMany({ dayLog: [], rotationState: { slot: "bench" } });
    expect(data).toMatchObject({
      settings: DEFAULT_SETTINGS,
      dayLog: [],
      rotationState: { slot: "bench" },
    });
    expect((await client.loadAll()).settings).toEqual(DEFAULT_SETTINGS);
  });

  it("appends and deletes sets by id, leaving unreadable rows alone", async () => {
    const [first, second] = [
      logged(exercise(), nov(16), 8, 20),
      logged(exercise(), nov(16), 9, 20),
    ];
    const { client, data } = createMemoryBackend({ history: ["garbage"] });
    await client.appendSet(first!);
    await client.appendSet(second!);
    await client.deleteSet(first!.id);
    expect(data.history).toEqual(["garbage", second]);
  });

  it("an import replaces what the file contains and nothing else", async () => {
    const { client, data } = createMemoryBackend({ settings: DEFAULT_SETTINGS });
    await client.importData({ app: "Nabd", version: 2, program: EMPTY_PROGRAM });
    expect(data.program).toEqual(EMPTY_PROGRAM);
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data).not.toHaveProperty("app");
  });
});
