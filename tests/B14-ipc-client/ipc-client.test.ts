import { DEFAULT_SETTINGS } from "@nabd/domain";
import { createIpcClient, isTauri } from "@nabd/ipc-client";
import type { Invoke, Listen, TrayAction } from "@nabd/ipc-client";
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
    await client.notify("idle", "Bench");
    await client.setVibrancy(0.7);
    await client.setAutostart(true);
    await client.updateTray(tray);
    await client.exportData();
    await client.getIdleSeconds();
    expect(invoke.mock.calls).toEqual([
      ["notify", { reason: "idle", exercise: "Bench" }],
      ["set_vibrancy", { opacity: 0.7 }],
      ["set_autostart", { enabled: true }],
      ["update_tray", { state: tray }],
      ["export_data"],
      ["get_idle_seconds"],
    ]);
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

  it("detects the absence of a Tauri runtime", () => {
    expect(isTauri()).toBe(false);
  });
});
