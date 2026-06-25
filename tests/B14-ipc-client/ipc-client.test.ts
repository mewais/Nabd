import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createIpcClient,
  isTauri,
  tauriInvoke,
  defaultClient,
} from "@nabd/ipc-client";
import type { Invoke, BootSnapshot, IpcClient } from "@nabd/ipc-client";
import type { LoggedSet, Program, Settings, Theme } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const sampleLoggedSet: LoggedSet = {
  id: "set-1",
  exId: "bench-press",
  exercise: "Bench Press",
  group: "Chest",
  muscles: ["chest", "triceps"],
  value: 8,
  weight: 80,
  ts: "2024-01-15T09:30:00.000Z",
  date: "2024-01-15",
  trigger: "manual",
};

const sampleProgram: Program = {
  name: "Strength",
  type: "fixed",
  schedule: "weekday",
  days: [],
};

const sampleSettings: Settings = {
  theme: "dark",
  opacity: 0.55,
  wallpaper: "aurora",
  openAtStartup: true,
  minimizedByDefault: false,
  interval: 50,
  idleNudge: 30,
};

// The real `load_all` command returns a SINGLE JSON string whose singleton
// fields are already nested objects (not individually stringified).
// Do ONE JSON.parse — do NOT re-parse singletons.
const wireBootPayload = JSON.stringify({
  program: sampleProgram,
  settings: sampleSettings,
  theme: "dark" satisfies Theme,
  customExercises: null,
  rotationState: null,
  dayState: null,
  history: [sampleLoggedSet],
});

// Expected parsed BootSnapshot (what createIpcClient should return from loadAll).
const expectedBootSnapshot: BootSnapshot = {
  program: sampleProgram,
  settings: sampleSettings,
  theme: "dark",
  customExercises: null,
  rotationState: null,
  dayState: null,
  history: [sampleLoggedSet],
};

// All-null snapshot: single JSON string with null singletons + empty history.
const wireBootPayloadNullSingletons = JSON.stringify({
  program: null,
  settings: null,
  theme: null,
  customExercises: null,
  rotationState: null,
  dayState: null,
  history: [],
});

const expectedBootSnapshotNullSingletons: BootSnapshot = {
  program: null,
  settings: null,
  theme: null,
  customExercises: null,
  rotationState: null,
  dayState: null,
  history: [],
};

// ---------------------------------------------------------------------------
// createIpcClient — all IpcClient methods
// ---------------------------------------------------------------------------

describe("createIpcClient", () => {
  let fakeInvoke: ReturnType<typeof vi.fn>;
  let client: IpcClient;

  beforeEach(() => {
    fakeInvoke = vi.fn();
    client = createIpcClient(fakeInvoke as unknown as Invoke);
  });

  // ── init ──────────────────────────────────────────────────────────────────

  describe("init", () => {
    it("calls invoke with cmd='init' and no args", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.init();
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("init");
    });

    it("returns void (undefined)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const result = await client.init();
      expect(result).toBeUndefined();
    });
  });

  // ── loadAll ───────────────────────────────────────────────────────────────

  describe("loadAll", () => {
    it("calls invoke with cmd='load_all' and no args", async () => {
      fakeInvoke.mockResolvedValueOnce(wireBootPayload);
      await client.loadAll();
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("load_all");
    });

    it("does ONE JSON.parse on the wire string and returns singletons as nested objects (not re-parsed)", async () => {
      fakeInvoke.mockResolvedValueOnce(wireBootPayload);
      const snap = await client.loadAll();
      expect(snap.program).toEqual(sampleProgram);
      expect(snap.settings).toEqual(sampleSettings);
      expect(snap.theme).toEqual("dark");
    });

    it("returns the history array from the parsed JSON", async () => {
      fakeInvoke.mockResolvedValueOnce(wireBootPayload);
      const snap = await client.loadAll();
      expect(snap.history).toEqual([sampleLoggedSet]);
    });

    it("returns null singletons and empty history when the wire JSON string encodes all-null singletons", async () => {
      fakeInvoke.mockResolvedValueOnce(wireBootPayloadNullSingletons);
      const snap = await client.loadAll();
      expect(snap).toEqual(expectedBootSnapshotNullSingletons);
    });

    it("returns an empty history array when the wire JSON string encodes history as []", async () => {
      fakeInvoke.mockResolvedValueOnce(wireBootPayloadNullSingletons);
      const snap = await client.loadAll();
      expect(snap.history).toEqual([]);
    });

    it("returns a BootSnapshot that deep-equals the expected shape", async () => {
      fakeInvoke.mockResolvedValueOnce(wireBootPayload);
      const snap = await client.loadAll();
      expect(snap).toEqual(expectedBootSnapshot);
    });
  });

  // ── saveSingleton ─────────────────────────────────────────────────────────

  describe("saveSingleton", () => {
    it("calls invoke('save_singleton', {key, value}) with value JSON-stringified", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.saveSingleton("theme", "dark");
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("save_singleton", {
        key: "theme",
        value: '"dark"',
      });
    });

    it("JSON-stringifies a non-string value (object)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.saveSingleton("settings", sampleSettings);
      expect(fakeInvoke).toHaveBeenCalledWith("save_singleton", {
        key: "settings",
        value: JSON.stringify(sampleSettings),
      });
    });

    it("JSON-stringifies a null value", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.saveSingleton("program", null);
      expect(fakeInvoke).toHaveBeenCalledWith("save_singleton", {
        key: "program",
        value: "null",
      });
    });

    it("returns void (undefined)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const result = await client.saveSingleton("theme", "dark");
      expect(result).toBeUndefined();
    });
  });

  // ── appendSet ─────────────────────────────────────────────────────────────

  describe("appendSet", () => {
    it("calls invoke('append_set', {rowJson}) with the row JSON-stringified", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.appendSet(sampleLoggedSet);
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("append_set", {
        rowJson: JSON.stringify(sampleLoggedSet),
      });
    });

    it("returns void (undefined)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const result = await client.appendSet(sampleLoggedSet);
      expect(result).toBeUndefined();
    });
  });

  // ── exportData ────────────────────────────────────────────────────────────

  describe("exportData", () => {
    it("calls invoke('export_data') with no args", async () => {
      fakeInvoke.mockResolvedValueOnce('{"app":"Nabd","version":1}');
      await client.exportData();
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("export_data");
    });

    it("returns the JSON string returned by invoke", async () => {
      const exportJson = '{"app":"Nabd","version":1,"history":[]}';
      fakeInvoke.mockResolvedValueOnce(exportJson);
      const result = await client.exportData();
      expect(result).toBe(exportJson);
    });
  });

  // ── importData ────────────────────────────────────────────────────────────

  describe("importData", () => {
    it("calls invoke('import_data', {json}) with the passed json string", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const json = '{"app":"Nabd","version":1}';
      await client.importData(json);
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("import_data", { json });
    });

    it("returns void (undefined)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const result = await client.importData('{"app":"Nabd","version":1}');
      expect(result).toBeUndefined();
    });
  });

  // ── notify ────────────────────────────────────────────────────────────────

  describe("notify", () => {
    it("calls invoke('notify', {reason, exercise}) for timer reason", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.notify("timer", "Bench Press");
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("notify", {
        reason: "timer",
        exercise: "Bench Press",
      });
    });

    it("calls invoke('notify', {reason, exercise}) for idle reason", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.notify("idle", "Squat");
      expect(fakeInvoke).toHaveBeenCalledWith("notify", {
        reason: "idle",
        exercise: "Squat",
      });
    });

    it("returns void (undefined)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const result = await client.notify("timer", "Bench Press");
      expect(result).toBeUndefined();
    });
  });

  // ── setVibrancy ───────────────────────────────────────────────────────────

  describe("setVibrancy", () => {
    it("calls invoke('set_vibrancy', {opacity}) with the opacity number", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      await client.setVibrancy(0.7);
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("set_vibrancy", { opacity: 0.7 });
    });

    it("returns void (undefined)", async () => {
      fakeInvoke.mockResolvedValueOnce(undefined);
      const result = await client.setVibrancy(0.5);
      expect(result).toBeUndefined();
    });
  });

  // ── getIdleSeconds ────────────────────────────────────────────────────────

  describe("getIdleSeconds", () => {
    it("calls invoke('get_idle_seconds') with no args", async () => {
      fakeInvoke.mockResolvedValueOnce(42);
      await client.getIdleSeconds();
      expect(fakeInvoke).toHaveBeenCalledOnce();
      expect(fakeInvoke).toHaveBeenCalledWith("get_idle_seconds");
    });

    it("returns the number returned by invoke", async () => {
      fakeInvoke.mockResolvedValueOnce(42);
      const result = await client.getIdleSeconds();
      expect(result).toBe(42);
    });

    it("returns 0 when idle seconds is 0", async () => {
      fakeInvoke.mockResolvedValueOnce(0);
      const result = await client.getIdleSeconds();
      expect(result).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// isTauri — window.__TAURI_INTERNALS__ detection
// ---------------------------------------------------------------------------

describe("isTauri", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore window to its original state after each test.
    if (originalWindow === undefined) {
      // In a node environment, window was never defined — clean up.
      try {
        // @ts-expect-error — intentional globalThis manipulation
        delete globalThis.window;
      } catch {
        // ignore if not configurable
      }
    } else {
      // @ts-expect-error — intentional globalThis manipulation
      globalThis.window = originalWindow;
    }
  });

  it("returns false when window is not defined", () => {
    // @ts-expect-error — intentional globalThis manipulation
    delete globalThis.window;
    expect(isTauri()).toBe(false);
  });

  it("returns false when window exists but __TAURI_INTERNALS__ is absent", () => {
    // @ts-expect-error — intentional globalThis manipulation
    globalThis.window = {} as Window;
    expect(isTauri()).toBe(false);
  });

  it("returns true when window.__TAURI_INTERNALS__ is present", () => {
    // @ts-expect-error — intentional globalThis manipulation
    globalThis.window = { __TAURI_INTERNALS__: {} } as unknown as Window;
    expect(isTauri()).toBe(true);
  });

  it("returns false after __TAURI_INTERNALS__ is removed from window", () => {
    // @ts-expect-error — intentional globalThis manipulation
    globalThis.window = { __TAURI_INTERNALS__: {} } as unknown as Window;
    expect(isTauri()).toBe(true);

    // @ts-expect-error — intentional globalThis manipulation
    delete globalThis.window.__TAURI_INTERNALS__;
    expect(isTauri()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tauriInvoke — transport factory
// ---------------------------------------------------------------------------

describe("tauriInvoke", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      try {
        // @ts-expect-error — intentional globalThis manipulation
        delete globalThis.window;
      } catch {
        // ignore
      }
    } else {
      // @ts-expect-error — intentional globalThis manipulation
      globalThis.window = originalWindow;
    }
  });

  describe("non-tauri branch (isTauri() is false)", () => {
    beforeEach(() => {
      // Ensure window has no __TAURI_INTERNALS__ → isTauri() returns false.
      // @ts-expect-error — intentional globalThis manipulation
      globalThis.window = {} as Window;
    });

    it("returns a function (an Invoke)", () => {
      const invoke = tauriInvoke();
      expect(typeof invoke).toBe("function");
    });

    it("the returned Invoke rejects with an Error when called", async () => {
      const invoke = tauriInvoke();
      await expect(invoke("any_cmd")).rejects.toBeInstanceOf(Error);
    });

    it("the rejection message is 'tauri unavailable'", async () => {
      const invoke = tauriInvoke();
      await expect(invoke("any_cmd")).rejects.toThrow("tauri unavailable");
    });

    it("rejects regardless of cmd name", async () => {
      const invoke = tauriInvoke();
      await expect(invoke("load_all")).rejects.toThrow("tauri unavailable");
    });

    it("rejects regardless of args", async () => {
      const invoke = tauriInvoke();
      await expect(invoke("save_singleton", { key: "theme", value: '"dark"' })).rejects.toThrow(
        "tauri unavailable",
      );
    });
  });

  describe("tauri branch (isTauri() is true)", () => {
    it("returns a function (an Invoke) when __TAURI_INTERNALS__ is present", () => {
      // @ts-expect-error — intentional globalThis manipulation
      globalThis.window = { __TAURI_INTERNALS__: {} } as unknown as Window;
      const invoke = tauriInvoke();
      expect(typeof invoke).toBe("function");
    });
  });
});

// ---------------------------------------------------------------------------
// defaultClient — smoke-test that it returns an IpcClient with all methods
// ---------------------------------------------------------------------------

describe("defaultClient", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Provide a non-tauri window so tauriInvoke() doesn't dynamically import
    // @tauri-apps/api (which is unavailable in the test environment). This
    // means all method calls will reject with "tauri unavailable", which is
    // fine — we're testing the shape, not the Tauri runtime.
    // @ts-expect-error — intentional globalThis manipulation
    globalThis.window = {} as Window;
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      try {
        // @ts-expect-error — intentional globalThis manipulation
        delete globalThis.window;
      } catch {
        // ignore
      }
    } else {
      // @ts-expect-error — intentional globalThis manipulation
      globalThis.window = originalWindow;
    }
  });

  it("returns an object with an init method", () => {
    const client = defaultClient();
    expect(typeof client.init).toBe("function");
  });

  it("returns an object with a loadAll method", () => {
    const client = defaultClient();
    expect(typeof client.loadAll).toBe("function");
  });

  it("returns an object with a saveSingleton method", () => {
    const client = defaultClient();
    expect(typeof client.saveSingleton).toBe("function");
  });

  it("returns an object with an appendSet method", () => {
    const client = defaultClient();
    expect(typeof client.appendSet).toBe("function");
  });

  it("returns an object with an exportData method", () => {
    const client = defaultClient();
    expect(typeof client.exportData).toBe("function");
  });

  it("returns an object with an importData method", () => {
    const client = defaultClient();
    expect(typeof client.importData).toBe("function");
  });

  it("returns an object with a notify method", () => {
    const client = defaultClient();
    expect(typeof client.notify).toBe("function");
  });

  it("returns an object with a setVibrancy method", () => {
    const client = defaultClient();
    expect(typeof client.setVibrancy).toBe("function");
  });

  it("returns an object with a getIdleSeconds method", () => {
    const client = defaultClient();
    expect(typeof client.getIdleSeconds).toBe("function");
  });

  it("calling init on defaultClient rejects (no Tauri runtime)", async () => {
    const client = defaultClient();
    await expect(client.init()).rejects.toThrow("tauri unavailable");
  });

  it("calling loadAll on defaultClient rejects (no Tauri runtime)", async () => {
    const client = defaultClient();
    await expect(client.loadAll()).rejects.toThrow("tauri unavailable");
  });
});
