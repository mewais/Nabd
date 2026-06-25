/**
 * IT3 — frontend↔backend contract test
 *
 * Part 1: drives createIpcClient(spyInvoke) through every method and asserts
 *         the exact Tauri command name + args object sent to invoke.
 *
 * Part 2: reads src-tauri/src/lib.rs as text and asserts:
 *   (a) every command the client calls is defined as a Rust fn
 *   (b) every command is listed in generate_handler!
 *   (c) snake_case arg names map correctly from the camelCase the client sends
 *
 * This is a contract/drift test. Failures indicate real seam bugs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createIpcClient } from "@nabd/ipc-client";
import type { LoggedSet } from "@nabd/domain";

// ─── Paths ────────────────────────────────────────────────────────────────────

// Resolve from the monorepo root — this file lives at
// integration-tests/IT3-frontend-backend/contract.test.ts
// so two directories up is the monorepo root.
const REPO_ROOT = resolve("/work/mewais/Nabd");
const LIB_RS = resolve(REPO_ROOT, "src-tauri/src/lib.rs");

// ─── Part 1: IPC client → spy invoke assertions ───────────────────────────────

describe("IT3 Part 1 — IpcClient sends correct command + args to invoke", () => {
  // The spy invoke returns canned values per command.
  let spyInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spyInvoke = vi.fn();
  });

  it("init — calls invoke('init') with no args", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    await client.init();

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("init");
    expect(args).toBeUndefined();
  });

  it("loadAll — calls invoke('load_all') with no args, parses JSON string", async () => {
    const snapshot = {
      program: { id: "prog1", name: "Test", slots: [], rest: [] },
      settings: { dailyGoal: 3, restDays: [], units: "kg" as const },
      theme: "dark" as const,
      customExercises: null,
      rotationState: null,
      dayState: null,
      history: [],
    };
    spyInvoke.mockResolvedValueOnce(JSON.stringify(snapshot));
    const client = createIpcClient(spyInvoke);
    const result = await client.loadAll();

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("load_all");
    expect(args).toBeUndefined();

    // loadAll must parse the JSON string and return a BootSnapshot
    expect(result.program).toEqual(snapshot.program);
    expect(result.settings).toEqual(snapshot.settings);
    expect(result.theme).toBe("dark");
    expect(result.customExercises).toBeNull();
    expect(result.rotationState).toBeNull();
    expect(result.dayState).toBeNull();
    expect(result.history).toEqual([]);
  });

  it("loadAll — missing fields default to null / []", async () => {
    spyInvoke.mockResolvedValueOnce(JSON.stringify({}));
    const client = createIpcClient(spyInvoke);
    const result = await client.loadAll();

    expect(result.program).toBeNull();
    expect(result.settings).toBeNull();
    expect(result.theme).toBeNull();
    expect(result.customExercises).toBeNull();
    expect(result.rotationState).toBeNull();
    expect(result.dayState).toBeNull();
    expect(result.history).toEqual([]);
  });

  it("saveSingleton — calls invoke('save_singleton', { key, value: JSON.stringify(value) })", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    await client.saveSingleton("theme", "dark");

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("save_singleton");
    expect(args).toEqual({ key: "theme", value: '"dark"' });
  });

  it("saveSingleton — object value is JSON.stringified", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    const obj = { foo: 42 };
    await client.saveSingleton("settings", obj);

    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("save_singleton");
    expect(args).toEqual({ key: "settings", value: JSON.stringify(obj) });
    // value must be a string (JSON.stringified)
    expect(typeof (args as Record<string, unknown>).value).toBe("string");
  });

  it("appendSet — calls invoke('append_set', { rowJson: JSON.stringify(row) })", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    const row: LoggedSet = {
      id: "set-1",
      exerciseId: "ex-1",
      reps: 10,
      weight: 60,
      unit: "kg",
      ts: 1700000000000,
      slotId: "slot-1",
    };
    await client.appendSet(row);

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("append_set");
    expect(args).toEqual({ rowJson: JSON.stringify(row) });
    // rowJson must be a JSON string (not the object itself)
    expect(typeof (args as Record<string, unknown>).rowJson).toBe("string");
    expect(JSON.parse((args as Record<string, unknown>).rowJson as string)).toEqual(row);
  });

  it("exportData — calls invoke('export_data') with no args and returns the string", async () => {
    const exportJson = '{"version":1,"data":[]}';
    spyInvoke.mockResolvedValueOnce(exportJson);
    const client = createIpcClient(spyInvoke);
    const result = await client.exportData();

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("export_data");
    expect(args).toBeUndefined();
    expect(result).toBe(exportJson);
  });

  it("importData — calls invoke('import_data', { json })", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    const json = '{"version":1,"data":[]}';
    await client.importData(json);

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("import_data");
    expect(args).toEqual({ json });
  });

  it("notify — calls invoke('notify', { reason, exercise })", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    await client.notify("timer", "Pull-ups");

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("notify");
    expect(args).toEqual({ reason: "timer", exercise: "Pull-ups" });
  });

  it("notify — idle reason is forwarded verbatim", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    await client.notify("idle", "Squats");

    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("notify");
    expect(args).toEqual({ reason: "idle", exercise: "Squats" });
  });

  it("setVibrancy — calls invoke('set_vibrancy', { opacity })", async () => {
    spyInvoke.mockResolvedValueOnce(undefined);
    const client = createIpcClient(spyInvoke);
    await client.setVibrancy(0.85);

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("set_vibrancy");
    expect(args).toEqual({ opacity: 0.85 });
  });

  it("getIdleSeconds — calls invoke('get_idle_seconds') with no args and returns number", async () => {
    spyInvoke.mockResolvedValueOnce(42);
    const client = createIpcClient(spyInvoke);
    const result = await client.getIdleSeconds();

    expect(spyInvoke).toHaveBeenCalledTimes(1);
    const [cmd, args] = spyInvoke.mock.calls[0];
    expect(cmd).toBe("get_idle_seconds");
    expect(args).toBeUndefined();
    expect(result).toBe(42);
  });
});

// ─── Part 2: Rust source contract assertions ───────────────────────────────────

describe("IT3 Part 2 — Rust lib.rs contract verification", () => {
  let rustSrc: string;

  beforeEach(() => {
    rustSrc = readFileSync(LIB_RS, "utf-8");
  });

  // All commands the client calls — these MUST be registered in lib.rs
  const CLIENT_COMMANDS = [
    "init",
    "load_all",
    "save_singleton",
    "append_set",
    "export_data",
    "import_data",
    "notify",
    "set_vibrancy",
    "get_idle_seconds",
  ] as const;

  // Helper: extract the generate_handler! block content
  function getHandlerBlock(src: string): string {
    const match = src.match(/generate_handler!\s*\[([^\]]+)\]/s);
    if (!match) throw new Error("Could not find generate_handler! block in lib.rs");
    return match[1];
  }

  it("lib.rs can be read from the expected path", () => {
    expect(rustSrc.length).toBeGreaterThan(0);
    expect(rustSrc).toContain("tauri::command");
  });

  it("generate_handler! block is present", () => {
    const block = getHandlerBlock(rustSrc);
    expect(block).toBeTruthy();
  });

  // ── Per-command: fn definition + generate_handler! registration ───────────

  it("load_all — fn defined as #[tauri::command] fn load_all AND listed in generate_handler!", () => {
    // The fn must be annotated with #[tauri::command]
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn load_all\b/);
    // Must appear in generate_handler!
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bload_all\b/);
  });

  it("save_singleton — fn defined, in generate_handler!, takes key + value params", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn save_singleton\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bsave_singleton\b/);

    // Assert snake_case param names: key and value
    // The fn signature must contain both `key` and `value` parameters
    const fnMatch = rustSrc.match(/fn save_singleton\s*\(([\s\S]*?)\)/);
    expect(fnMatch).not.toBeNull();
    const params = fnMatch![1];
    expect(params).toMatch(/\bkey\s*:/);
    expect(params).toMatch(/\bvalue\s*:/);
  });

  it("append_set — fn defined, in generate_handler!, takes row_json param (camelCase rowJson → snake_case)", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn append_set\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bappend_set\b/);

    // The Rust fn must have `row_json` (the snake_case of JS `rowJson`)
    const fnMatch = rustSrc.match(/fn append_set\s*\(([\s\S]*?)\)/);
    expect(fnMatch).not.toBeNull();
    const params = fnMatch![1];
    expect(params).toMatch(/\brow_json\s*:/);
  });

  it("export_data — fn defined AND listed in generate_handler!", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn export_data\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bexport_data\b/);
  });

  it("import_data — fn defined, in generate_handler!, takes json param", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn import_data\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bimport_data\b/);

    const fnMatch = rustSrc.match(/fn import_data\s*\(([\s\S]*?)\)/);
    expect(fnMatch).not.toBeNull();
    const params = fnMatch![1];
    expect(params).toMatch(/\bjson\s*:/);
  });

  it("notify — fn defined, in generate_handler!, takes reason + exercise params", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn notify\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bnotify\b/);

    const fnMatch = rustSrc.match(/fn notify\s*(?:<[^>]*>)?\s*\(([\s\S]*?)\)/);
    expect(fnMatch).not.toBeNull();
    const params = fnMatch![1];
    expect(params).toMatch(/\breason\s*:/);
    expect(params).toMatch(/\bexercise\s*:/);
  });

  it("set_vibrancy — fn defined, in generate_handler!, takes opacity param", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn set_vibrancy\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bset_vibrancy\b/);

    const fnMatch = rustSrc.match(/fn set_vibrancy\s*(?:<[^>]*>)?\s*\(([\s\S]*?)\)/);
    expect(fnMatch).not.toBeNull();
    const params = fnMatch![1];
    expect(params).toMatch(/\bopacity\s*:/);
  });

  it("get_idle_seconds — fn defined AND listed in generate_handler!", () => {
    expect(rustSrc).toMatch(/#\[tauri::command\]\s*\nfn get_idle_seconds\b/);
    const handlerBlock = getHandlerBlock(rustSrc);
    expect(handlerBlock).toMatch(/\bget_idle_seconds\b/);
  });

  // ── CONTRACT MISMATCH: init ────────────────────────────────────────────────
  // The IPC client calls invoke("init") but lib.rs exposes NO #[tauri::command] fn init.
  // nabd_ipc::init() is called internally in the setup closure — NOT as a Tauri command.
  // This test documents the CORRECT contract (the command must be registered) so that
  // the mismatch is surfaced clearly.

  it("init — MUST be defined as a #[tauri::command] fn AND listed in generate_handler! [CONTRACT CHECK]", () => {
    // Check if init is registered as a tauri command
    const hasTauriCommandInit = /#\[tauri::command\]\s*\nfn init\b/.test(rustSrc);
    // Check if init appears in generate_handler!
    const handlerBlock = getHandlerBlock(rustSrc);
    const hasHandlerInit = /\binit\b/.test(handlerBlock);

    // Both must be true for the contract to hold.
    // If either fails, there is a front/back mismatch:
    //   - B14 client: calls invoke("init") → expects a registered Tauri command
    //   - lib.rs: nabd_ipc::init() is called in setup(), NOT exposed as a command
    expect(hasTauriCommandInit).toBe(true);
    expect(hasHandlerInit).toBe(true);
  });

  // ── Exhaustiveness: every client command must be in generate_handler! ──────

  it("every command the client calls appears in generate_handler!", () => {
    const handlerBlock = getHandlerBlock(rustSrc);
    const mismatches: string[] = [];

    for (const cmd of CLIENT_COMMANDS) {
      const pattern = new RegExp(`\\b${cmd}\\b`);
      if (!pattern.test(handlerBlock)) {
        mismatches.push(cmd);
      }
    }

    expect(
      mismatches,
      `Commands called by ipc-client but NOT in generate_handler![]: ${mismatches.join(", ")}`
    ).toEqual([]);
  });

  it("every command the client calls has a corresponding fn in lib.rs", () => {
    const mismatches: string[] = [];

    for (const cmd of CLIENT_COMMANDS) {
      // Each command must appear as a function definition (with or without generics)
      const pattern = new RegExp(`\\bfn ${cmd}\\b`);
      if (!pattern.test(rustSrc)) {
        mismatches.push(cmd);
      }
    }

    expect(
      mismatches,
      `Commands called by ipc-client but NOT defined as fn in lib.rs: ${mismatches.join(", ")}`
    ).toEqual([]);
  });
});
