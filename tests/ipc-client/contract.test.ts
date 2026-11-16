// The seam between the frontend and the Rust backend is written once on each
// side; this reads the Rust sources and holds the TypeScript side to them, so
// a rename on either side fails here rather than in the running app.

import { readFileSync } from "node:fs";
import {
  APPDATA_VERSION,
  DEFAULT_SETTINGS,
  LoggedSetSchema,
  NO_CAPABILITIES,
  SettingsSchema,
} from "@nabd/domain";
import type { IpcClient } from "@nabd/ipc-client";
import { EXPORT_PURPOSES, SINGLETON_KEYS, TRAY_ACTIONS, tauriClient } from "@nabd/ipc-client";
import { exercise, logged, nov } from "../support/builders";

// Tauri's own API, as the client reaches it: what is invoked and listened to is recorded.
const tauri = vi.hoisted(() => ({
  invoked: [] as [string, Record<string, unknown> | undefined][],
  listened: [] as string[],
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args?: Record<string, unknown>) => {
    tauri.invoked.push([command, args]);
    return Promise.resolve(command === "load_all" ? "{}" : undefined);
  },
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string) => {
    tauri.listened.push(event);
    return Promise.resolve(() => {});
  },
}));

const rust = (path: string): string =>
  readFileSync(new URL(`../../src-tauri/${path}`, import.meta.url), "utf8");

const camelCase = (name: string): string =>
  name.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** The fields of `pub struct name`, as serde names them in camelCase. */
function structFields(source: string, name: string): string[] {
  const body = new RegExp(`pub struct ${name} \\{([^}]*)\\}`).exec(source)?.[1];
  if (body === undefined) throw new Error(`no struct ${name}`);
  return [...body.matchAll(/pub (\w+):/g)].map((field) => camelCase(field[1]!));
}

/** The value of `const name: &str = "…"`. */
function stringConst(source: string, name: string): string {
  const value = new RegExp(`const ${name}: &str = "([^"]*)"`).exec(source)?.[1];
  if (value === undefined) throw new Error(`no constant ${name}`);
  return value;
}

/** Split a parameter list at its top-level commas (not those inside `<…>`). */
function params(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of list) {
    if (char === "<") depth += 1;
    if (char === ">") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  return [...parts, current].map((part) => part.trim()).filter(Boolean);
}

/** Each `#[tauri::command]`, with the argument names the frontend sends (Tauri's camelCase). */
function commands(): Map<string, string[]> {
  const source = rust("src/commands/data.rs") + rust("src/commands/native.rs");
  const found = source.matchAll(/#\[tauri::command\]\s*pub fn (\w+)(?:<[^>]*>)?\(([^)]*)\)/g);
  return new Map(
    [...found].map(([, name, list]) => [
      name!,
      params(list!)
        .filter((param) => !/:\s*(State|AppHandle)</.test(param))
        .map((param) => camelCase(param.split(":")[0]!.trim())),
    ]),
  );
}

/** Every method of the client, called once: a new method must be added here. */
const CALLS: Record<keyof IpcClient, (client: IpcClient) => Promise<unknown>> = {
  loadAll: (c) => c.loadAll(),
  save: (c) => c.save("settings", DEFAULT_SETTINGS),
  saveMany: (c) => c.saveMany({ dayLog: [] }),
  appendSet: (c) => c.appendSet(logged(exercise(), nov(16), 8, 20)),
  deleteSet: (c) => c.deleteSet("s1"),
  exportData: (c) => c.exportData("manual"),
  importData: (c) => c.importData({ app: "Nabd", version: APPDATA_VERSION }),
  platformCapabilities: (c) => c.platformCapabilities(),
  notifyNudge: (c) => c.notifyNudge({ title: "Time to move", body: "Bench" }),
  sendTestNotification: (c) => c.sendTestNotification(),
  setGlass: (c) => c.setGlass(true),
  setAutostart: (c) => c.setAutostart(true),
  updateTray: (c) => c.updateTray({ nextExercise: "Bench", done: 1, total: 3, paused: false }),
  quit: (c) => c.quit(),
  onTick: (c) => c.onTick(() => {}),
  onTrayAction: (c) => c.onTrayAction(() => {}),
};

describe("the frontend and the Rust backend agree on", () => {
  beforeAll(async () => {
    const client = tauriClient();
    for (const call of Object.values(CALLS)) await call(client);
  });

  it("every command the client invokes, by name and argument names, and all are registered", () => {
    const backend = commands();
    const registered = [...rust("src/commands/mod.rs").matchAll(/(?:data|native)::(\w+),/g)].map(
      (entry) => entry[1],
    );
    expect(registered.sort()).toEqual([...backend.keys()].sort());
    for (const [command, args] of tauri.invoked) {
      expect([command, Object.keys(args ?? {})]).toEqual([command, backend.get(command)]);
    }
    expect(new Set(tauri.invoked.map(([command]) => command))).toEqual(new Set(backend.keys()));
  });

  it("the events the client listens to", () => {
    expect(tauri.listened).toEqual([
      stringConst(rust("src/clock.rs"), "TICK_EVENT"),
      stringConst(rust("src/tray.rs"), "TRAY_ACTION_EVENT"),
    ]);
  });

  it("the singleton keys the store accepts", () => {
    const source = rust("crates/persistence/src/store.rs");
    const list = /KV_KEYS: \[&str; \d+\] = \[([^\]]*)\]/.exec(source)?.[1] ?? "";
    expect(SINGLETON_KEYS).toEqual([...list.matchAll(/"(\w+)"/g)].map((key) => key[1]));
  });

  it("the fields of a logged set", () => {
    const set = LoggedSetSchema.parse(logged(exercise(), nov(16), 8, 20));
    const row = structFields(rust("crates/persistence/src/logged_set.rs"), "LoggedSetRow");
    expect(Object.keys(set).sort()).toEqual(row.sort());
  });

  it("the tray's state, and the actions it hands the frontend", () => {
    const tray = rust("crates/native/src/tray.rs");
    const [, { state }] = tauri.invoked.find(([command]) => command === "update_tray") as [
      string,
      { state: object },
    ];
    expect(Object.keys(state).sort()).toEqual(structFields(tray, "TrayState").sort());
    const handed = /fn frontend_action[\s\S]*?\n {4}\}/.exec(tray)?.[0] ?? "";
    const actions = [...handed.matchAll(/Some\((TRAY_\w+)\)/g)].map((id) =>
      stringConst(tray, id[1]!),
    );
    expect(actions.sort()).toEqual([...TRAY_ACTIONS].sort());
  });

  it("a desktop notification, the machine's capabilities and the export purposes", () => {
    const native = (file: string) => rust(`crates/native/src/${file}.rs`);
    const [, { notification }] = tauri.invoked.find(([command]) => command === "notify_nudge") as [
      string,
      { notification: object },
    ];
    expect(Object.keys(notification)).toEqual(
      structFields(native("notification"), "DesktopNotification"),
    );
    expect(Object.keys(NO_CAPABILITIES)).toEqual(structFields(native("platform"), "Capabilities"));
    const purposes = /pub enum ExportPurpose \{([^}]*)\}/.exec(native("export"))?.[1] ?? "";
    const snakeCase = (name: string) => name.replace(/(?<!^)([A-Z])/g, "_$1").toLowerCase();
    expect([...purposes.matchAll(/^\s*(\w+),/gm)].map((v) => snakeCase(v[1]!))).toEqual([
      ...EXPORT_PURPOSES,
    ]);
  });

  it("the settings the backend reads itself", () => {
    const read = [...rust("crates/ipc/src/lib.rs").matchAll(/settings\["(\w+)"\]/g)].map(
      (field) => field[1]!,
    );
    expect(read).not.toHaveLength(0);
    for (const field of read) expect(SettingsSchema.shape).toHaveProperty(field);
  });
});
