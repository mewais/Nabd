import { isTauri, tauriClient } from "@nabd/ipc-client";

// Tauri's own API, as the client reaches it.
const tauri = vi.hoisted(() => ({
  invoke: vi.fn<(cmd: string, args?: unknown) => Promise<unknown>>(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));

function setup() {
  tauri.invoke.mockReset().mockResolvedValue(undefined);
  return tauriClient();
}

describe("ipc client", () => {
  it("sends the tray only whole, non-negative set counts", async () => {
    const client = setup();
    const send = async (done: number, total: number) => {
      await client.updateTray({ nextExercise: null, done, total, paused: true, today: "skip" });
      const [, args] = tauri.invoke.mock.calls.at(-1) as [string, { state: unknown }];
      return args.state;
    };
    expect(await send(-1, 2.6)).toEqual({
      nextExercise: null,
      done: 0,
      total: 3,
      paused: true,
      today: "skip",
    });
    expect(await send(Number.NaN, Number.POSITIVE_INFINITY)).toMatchObject({ done: 0, total: 0 });
  });

  it("passes backend failures through", async () => {
    const client = setup();
    tauri.invoke.mockRejectedValue(new Error("unknown singleton key: x"));
    await expect(client.deleteSet("s")).rejects.toThrow("unknown singleton key");
  });

  it("detects the absence of a Tauri runtime", () => {
    expect(isTauri()).toBe(false);
  });
});
