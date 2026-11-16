import { APPDATA_VERSION, DEFAULT_SETTINGS } from "@nabd/domain";
import { createIpcClient, isTauri } from "@nabd/ipc-client";
import type { Invoke, Listen, Tick, TrayAction } from "@nabd/ipc-client";
import { exercise, logged, nov } from "../support/domain-factories";

function setup(result: unknown = undefined) {
  const invoke = vi.fn(async () => result);
  const unlisten = vi.fn();
  const listen = vi.fn(async () => unlisten);
  const client = createIpcClient(invoke as unknown as Invoke, listen as unknown as Listen);
  return { client, invoke, listen, unlisten };
}

describe("ipc client", () => {
  it("parses the boot snapshot", async () => {
    const { client, invoke } = setup(JSON.stringify({ program: null, history: [] }));
    await expect(client.loadAll()).resolves.toEqual({ program: null, history: [] });
    expect(invoke).toHaveBeenCalledWith("load_all");
  });

  it("sends singletons and sets as JSON under the argument names the backend expects", async () => {
    const { client, invoke } = setup();
    const set = logged(exercise(), nov(16), 8, 20);
    await client.save("settings", DEFAULT_SETTINGS);
    await client.appendSet(set);
    await client.deleteSet("s1");
    await client.importData({ app: "Nabd", version: 2 });
    expect(invoke.mock.calls).toEqual([
      ["save_singleton", { key: "settings", value: JSON.stringify(DEFAULT_SETTINGS) }],
      ["append_set", { rowJson: JSON.stringify(set) }],
      ["delete_set", { id: "s1" }],
      ["import_data", { json: JSON.stringify({ app: "Nabd", version: 2 }) }],
    ]);
  });

  it("forwards the native commands", async () => {
    const { client, invoke } = setup();
    const tray = { nextExercise: "Bench", done: 1, total: 9, paused: false };
    await client.platformCapabilities();
    await client.notifyNudge({ title: "Time to move", body: "Bench" });
    await client.sendTestNotification();
    await client.setGlass(false);
    await client.setAutostart(true);
    await client.updateTray(tray);
    await client.exportData();
    await client.quit();
    expect(invoke.mock.calls).toEqual([
      ["platform_capabilities"],
      ["notify_nudge", { notification: { title: "Time to move", body: "Bench" } }],
      ["send_test_notification"],
      ["set_glass", { enabled: false }],
      ["set_autostart", { enabled: true }],
      ["update_tray", { state: tray }],
      ["export_data", { version: APPDATA_VERSION }],
      ["quit"],
    ]);
  });

  it("sends several singletons as key/JSON pairs in one call", async () => {
    const { client, invoke } = setup();
    await client.saveMany({ rotationState: { s1: 1 }, dayLog: [] });
    expect(invoke.mock.calls).toEqual([
      [
        "save_singletons",
        {
          entries: [
            ["rotationState", JSON.stringify({ s1: 1 })],
            ["dayLog", "[]"],
          ],
        },
      ],
    ]);
  });

  it("sends the tray only whole, non-negative set counts", async () => {
    const { client, invoke } = setup();
    const send = async (done: number, total: number) => {
      await client.updateTray({ nextExercise: null, done, total, paused: true });
      const [, args] = invoke.mock.calls.at(-1) as unknown as [string, { state: unknown }];
      return args.state;
    };
    expect(await send(-1, 2.6)).toEqual({ nextExercise: null, done: 0, total: 3, paused: true });
    expect(await send(Number.NaN, Number.POSITIVE_INFINITY)).toMatchObject({ done: 0, total: 0 });
  });

  it("passes backend failures through", async () => {
    const invoke = vi.fn(async () => {
      throw new Error("unknown singleton key: x");
    });
    const client = createIpcClient(invoke as unknown as Invoke, vi.fn() as unknown as Listen);
    await expect(client.deleteSet("s")).rejects.toThrow("unknown singleton key");
  });

  it("subscribes to tray actions and hands back the unsubscribe function", async () => {
    const { client, listen, unlisten } = setup();
    const handler = vi.fn<(a: TrayAction) => void>();
    const unsubscribe = await client.onTrayAction(handler);
    expect(listen).toHaveBeenCalledWith("tray-action", handler);
    expect(unsubscribe).toBe(unlisten);
  });

  it("subscribes to the backend clock", async () => {
    const { client, listen, unlisten } = setup();
    const handler = vi.fn<(t: Tick) => void>();
    const unsubscribe = await client.onTick(handler);
    expect(listen).toHaveBeenCalledWith("tick", handler);
    expect(unsubscribe).toBe(unlisten);
  });

  it("detects the absence of a Tauri runtime", () => {
    expect(isTauri()).toBe(false);
  });
});
