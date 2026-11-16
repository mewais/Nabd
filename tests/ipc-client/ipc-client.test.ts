import { APPDATA_VERSION, DEFAULT_SETTINGS } from "@nabd/domain";
import { isTauri, tauriClient } from "@nabd/ipc-client";
import { exercise, logged, nov } from "../support/builders";

// Tauri's own API, as the client reaches it: each command invoked, each event listened to.
const tauri = vi.hoisted(() => ({
  invoke: vi.fn<(cmd: string, args?: unknown) => Promise<unknown>>(),
  listen:
    vi.fn<(event: string, handler: (event: { payload: unknown }) => void) => Promise<unknown>>(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: tauri.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: tauri.listen }));

function setup(result: unknown = undefined) {
  const unlisten = vi.fn();
  tauri.invoke.mockReset().mockResolvedValue(result);
  tauri.listen.mockReset().mockResolvedValue(unlisten);
  // Each command as it was invoked: its name, and its arguments when it has any.
  const calls = () =>
    tauri.invoke.mock.calls.map((call) => call.filter((arg) => arg !== undefined));
  return { client: tauriClient(), calls, unlisten };
}

/** What the backend sends with an event reaches the handler, and unsubscribing is handed back. */
async function expectSubscription(
  subscribe: (handler: (payload: unknown) => void) => Promise<() => void>,
  event: string,
  unlisten: () => void,
) {
  const handler = vi.fn();
  const unsubscribe = await subscribe(handler);
  const [name, deliver] = tauri.listen.mock.calls.at(-1)!;
  expect(name).toBe(event);
  deliver({ payload: "sent" });
  expect(handler).toHaveBeenCalledWith("sent");
  expect(unsubscribe).toBe(unlisten);
}

describe("ipc client", () => {
  it("parses the boot snapshot", async () => {
    const { client, calls } = setup(JSON.stringify({ program: null, history: [] }));
    await expect(client.loadAll()).resolves.toEqual({ program: null, history: [] });
    expect(calls()).toEqual([["load_all"]]);
  });

  it("sends singletons and sets as JSON under the argument names the backend expects", async () => {
    const { client, calls } = setup();
    const set = logged(exercise(), nov(16), 8, 20);
    await client.save("settings", DEFAULT_SETTINGS);
    await client.appendSet(set);
    await client.deleteSet("s1");
    await client.importData({ app: "Nabd", version: 2 });
    expect(calls()).toEqual([
      ["save_singleton", { key: "settings", value: JSON.stringify(DEFAULT_SETTINGS) }],
      ["append_set", { rowJson: JSON.stringify(set) }],
      ["delete_set", { id: "s1" }],
      ["import_data", { json: JSON.stringify({ app: "Nabd", version: 2 }) }],
    ]);
  });

  it("forwards the native commands", async () => {
    const { client, calls } = setup();
    const tray = { nextExercise: "Bench", done: 1, total: 9, paused: false };
    await client.platformCapabilities();
    await client.notifyNudge({ title: "Time to move", body: "Bench" });
    await client.sendTestNotification();
    await client.setGlass(false);
    await client.setAutostart(true);
    await client.updateTray(tray);
    await client.exportData("manual");
    await client.exportData("before_import");
    await client.quit();
    expect(calls()).toEqual([
      ["platform_capabilities"],
      ["notify_nudge", { notification: { title: "Time to move", body: "Bench" } }],
      ["send_test_notification"],
      ["set_glass", { enabled: false }],
      ["set_autostart", { enabled: true }],
      ["update_tray", { state: tray }],
      ["export_data", { version: APPDATA_VERSION, purpose: "manual" }],
      ["export_data", { version: APPDATA_VERSION, purpose: "before_import" }],
      ["quit"],
    ]);
  });

  it("sends several singletons as key/JSON pairs in one call", async () => {
    const { client, calls } = setup();
    await client.saveMany({ rotationState: { s1: "bench" }, dayLog: [] });
    expect(calls()).toEqual([
      [
        "save_singletons",
        {
          entries: [
            ["rotationState", JSON.stringify({ s1: "bench" })],
            ["dayLog", "[]"],
          ],
        },
      ],
    ]);
  });

  it("sends the tray only whole, non-negative set counts", async () => {
    const { client, calls } = setup();
    const send = async (done: number, total: number) => {
      await client.updateTray({ nextExercise: null, done, total, paused: true });
      const [, args] = calls().at(-1) as [string, { state: unknown }];
      return args.state;
    };
    expect(await send(-1, 2.6)).toEqual({ nextExercise: null, done: 0, total: 3, paused: true });
    expect(await send(Number.NaN, Number.POSITIVE_INFINITY)).toMatchObject({ done: 0, total: 0 });
  });

  it("passes backend failures through", async () => {
    const { client } = setup();
    tauri.invoke.mockRejectedValue(new Error("unknown singleton key: x"));
    await expect(client.deleteSet("s")).rejects.toThrow("unknown singleton key");
  });

  it("subscribes to tray actions and hands back the unsubscribe function", async () => {
    const { client, unlisten } = setup();
    await expectSubscription((handler) => client.onTrayAction(handler), "tray-action", unlisten);
  });

  it("subscribes to the backend clock", async () => {
    const { client, unlisten } = setup();
    await expectSubscription((handler) => client.onTick(handler), "tick", unlisten);
  });

  it("detects the absence of a Tauri runtime", () => {
    expect(isTauri()).toBe(false);
  });
});
