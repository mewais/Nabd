/**
 * B15 · @nabd/store — test suite.
 *
 * Anti-stub contract: every mutating action MUST call the appropriate
 * client.saveSingleton / client.appendSet. This file verifies that.
 *
 * Tests are ALL RED until the implementation is written (skeleton throws).
 * Coverage: 100% lines/functions/statements of packages/B15-store/src/index.ts.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import type { StoreApi } from "zustand";
import { createNabdStore, initialState } from "@nabd/store";
import type { NabdStore, StoreDeps } from "@nabd/store";
import type { IpcClient, BootSnapshot } from "@nabd/ipc-client";
import { createLibrary } from "@nabd/dataset";
import type { Library } from "@nabd/dataset";
import type {
  Program,
  Settings,
  Theme,
  Exercise,
  LoggedSet,
  RotationState,
  DayState,
} from "@nabd/domain";
import { seedProgram } from "@nabd/program-editor";
import { DEFAULT_SETTINGS } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Fixed timestamp + deterministic id
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date("2026-06-24T10:00:00Z");
const NOW = () => FIXED_NOW;

let _idCounter = 0;
const newId = () => `test-id-${++_idCounter}`;

// ---------------------------------------------------------------------------
// Fixture exercises
// ---------------------------------------------------------------------------

const BENCH_PRESS: Exercise = {
  id: "bb-bench",
  name: "Barbell Bench Press",
  group: "Chest",
  primary: ["chest"],
  secondary: ["triceps", "front_delts"],
  equipment: "barbell",
  tracking: "weight_reps",
  timeBased: false,
};

const SQUAT: Exercise = {
  id: "back-squat",
  name: "Back Squat",
  group: "Quads",
  primary: ["quads"],
  secondary: ["glutes", "hamstrings"],
  equipment: "barbell",
  tracking: "weight_reps",
  timeBased: false,
};

const PLANK: Exercise = {
  id: "plank",
  name: "Plank",
  group: "Abs",
  primary: ["abs"],
  secondary: ["obliques"],
  equipment: "bodyweight",
  tracking: "duration",
  timeBased: true,
};

const PULL_UP: Exercise = {
  id: "pullup",
  name: "Pull-up",
  group: "Back",
  primary: ["lats"],
  secondary: ["biceps", "rhomboids"],
  equipment: "pullupbar",
  tracking: "weighted_bodyweight",
  timeBased: false,
};

const SEED_EXERCISES: Exercise[] = [BENCH_PRESS, SQUAT, PLANK, PULL_UP];

// ---------------------------------------------------------------------------
// Fixture program — weekday PPL (Monday = Push with Bench Press)
// ---------------------------------------------------------------------------

const FIXTURE_PROGRAM: Program = {
  name: "Test Program",
  type: "fixed",
  schedule: "weekday",
  days: [
    {
      id: "push-day",
      name: "Push",
      weekday: 3, // Wednesday = 2026-06-24 is a Wednesday
      slots: [],
      exercises: [
        {
          id: "ex-row-1",
          exId: "bb-bench",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [
            { type: "working", a: 8, b: 12 },
            { type: "working", a: 8, b: 12 },
            { type: "working", a: 8, b: 12 },
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture boot snapshot
// ---------------------------------------------------------------------------

const FIXTURE_HISTORY: LoggedSet[] = [
  {
    id: "h1",
    exId: "bb-bench",
    exercise: "Barbell Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 80,
    ts: "2026-06-23T09:00:00Z",
    date: "2026-06-23",
    trigger: "manual",
  },
];

const FIXTURE_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  interval: 45,
  idleNudge: 25,
};

const FIXTURE_THEME: Theme = "dark";

const FIXTURE_ROTATION: RotationState = {};

const FIXTURE_DAY_STATE: DayState = {
  date: "2026-06-24",
  floatingIndex: 0,
  slots: [],
};

const BOOT_SNAPSHOT_FULL: BootSnapshot = {
  program: FIXTURE_PROGRAM,
  settings: FIXTURE_SETTINGS,
  theme: FIXTURE_THEME,
  customExercises: [],
  rotationState: FIXTURE_ROTATION,
  dayState: FIXTURE_DAY_STATE,
  history: FIXTURE_HISTORY,
};

const BOOT_SNAPSHOT_NULL: BootSnapshot = {
  program: null,
  settings: null,
  theme: null,
  customExercises: null,
  rotationState: null,
  dayState: null,
  history: [],
};

// ---------------------------------------------------------------------------
// Fake IpcClient builder
// ---------------------------------------------------------------------------

function makeFakeClient(snapshot: BootSnapshot = BOOT_SNAPSHOT_FULL): IpcClient {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    loadAll: vi.fn().mockResolvedValue(snapshot),
    saveSingleton: vi.fn().mockResolvedValue(undefined),
    appendSet: vi.fn().mockResolvedValue(undefined),
    exportData: vi.fn().mockResolvedValue('{"app":"Nabd","version":1}'),
    importData: vi.fn().mockResolvedValue(undefined),
    notify: vi.fn().mockResolvedValue(undefined),
    setVibrancy: vi.fn().mockResolvedValue(undefined),
    getIdleSeconds: vi.fn().mockResolvedValue(0),
  };
}

// ---------------------------------------------------------------------------
// Store factory helpers
// ---------------------------------------------------------------------------

function makeLibrary(extras: Exercise[] = []): Library {
  return createLibrary([...SEED_EXERCISES, ...extras]);
}

function makeDeps(
  client: IpcClient = makeFakeClient(),
  library: Library = makeLibrary(),
): StoreDeps {
  _idCounter = 0;
  return { client, library, now: NOW, newId };
}

function makeStore(deps: StoreDeps): StoreApi<NabdStore> {
  return createNabdStore(deps);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function get(store: StoreApi<NabdStore>): NabdStore {
  return store.getState();
}

// ---------------------------------------------------------------------------
// initialState
// ---------------------------------------------------------------------------

describe("initialState", () => {
  it("returns the correct pre-hydrate initial state", () => {
    const deps = makeDeps();
    const s = initialState(deps);
    expect(s.screen).toBe("today");
    expect(s.booted).toBe(false);
    expect(s.activeSession).toBeNull();
    expect(s.slots).toEqual([]);
    expect(s.notif).toBeNull();
    expect(s.settingsOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createNabdStore — structure
// ---------------------------------------------------------------------------

describe("createNabdStore — structure", () => {
  it("returns a zustand store with getState/setState/subscribe and correct initial screen", () => {
    const deps = makeDeps();
    const store = createNabdStore(deps);
    expect(typeof store.getState).toBe("function");
    expect(typeof store.setState).toBe("function");
    expect(typeof store.subscribe).toBe("function");
    expect(store.getState().screen).toBe("today");
  });
});

// ---------------------------------------------------------------------------
// hydrate — with full snapshot
// ---------------------------------------------------------------------------

describe("hydrate() with full snapshot", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    const deps = makeDeps(client);
    store = makeStore(deps);
    await get(store).hydrate();
  });

  it("calls client.init()", () => {
    expect(client.init).toHaveBeenCalledOnce();
  });

  it("calls client.loadAll()", () => {
    expect(client.loadAll).toHaveBeenCalledOnce();
  });

  it("sets booted=true", () => {
    expect(get(store).booted).toBe(true);
  });

  it("populates program from snapshot", () => {
    expect(get(store).program).toEqual(FIXTURE_PROGRAM);
  });

  it("populates settings from snapshot", () => {
    expect(get(store).settings).toEqual(FIXTURE_SETTINGS);
  });

  it("populates theme from snapshot", () => {
    expect(get(store).theme).toBe(FIXTURE_THEME);
  });

  it("populates history from snapshot", () => {
    expect(get(store).history).toEqual(FIXTURE_HISTORY);
  });

  it("populates customExercises from snapshot", () => {
    expect(get(store).customExercises).toEqual([]);
  });

  it("populates rotationState from snapshot", () => {
    expect(get(store).rotationState).toEqual(FIXTURE_ROTATION);
  });

  it("resolves today's slots (Wednesday matches push-day)", () => {
    // FIXED_NOW = 2026-06-24 = Wednesday. push-day.weekday = 3 = Wednesday.
    const slots = get(store).slots;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].exId).toBe("bb-bench");
  });

  it("sets first slot status to 'now'", () => {
    const slots = get(store).slots;
    expect(slots[0].status).toBe("now");
  });

  it("computes coverage from history (chest was trained yesterday)", () => {
    const cov = get(store).coverage;
    // chest was hit once in history → should be > 0
    expect(cov.chest).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// hydrate — with null snapshot → seed defaults
// ---------------------------------------------------------------------------

describe("hydrate() with null snapshot → seed defaults", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_NULL);
    const deps = makeDeps(client);
    store = makeStore(deps);
    await get(store).hydrate();
  });

  it("sets booted=true", () => {
    expect(get(store).booted).toBe(true);
  });

  it("uses seedProgram() as default program", () => {
    const sp = seedProgram();
    expect(get(store).program.name).toBe(sp.name);
    expect(get(store).program.type).toBe(sp.type);
  });

  it("uses DEFAULT_SETTINGS", () => {
    expect(get(store).settings).toEqual(DEFAULT_SETTINGS);
  });

  it("uses 'translucent' as default theme", () => {
    expect(get(store).theme).toBe("translucent");
  });

  it("history is empty", () => {
    expect(get(store).history).toEqual([]);
  });

  it("coverage is all zeros", () => {
    const cov = get(store).coverage;
    const vals = Object.values(cov);
    expect(vals.every((v) => v === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Navigation / view
// ---------------------------------------------------------------------------

describe("setScreen", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("changes screen to 'planner'", () => {
    get(store).setScreen("planner");
    expect(get(store).screen).toBe("planner");
  });

  it("changes screen to 'progress'", () => {
    get(store).setScreen("progress");
    expect(get(store).screen).toBe("progress");
  });

  it("changes screen back to 'today'", () => {
    get(store).setScreen("planner");
    get(store).setScreen("today");
    expect(get(store).screen).toBe("today");
  });
});

describe("setMapView", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("changes mapView to 'front'", () => {
    get(store).setMapView("front");
    expect(get(store).mapView).toBe("front");
  });

  it("changes mapView to 'back'", () => {
    get(store).setMapView("back");
    expect(get(store).mapView).toBe("back");
  });

  it("changes mapView to 'both'", () => {
    get(store).setMapView("front");
    get(store).setMapView("both");
    expect(get(store).mapView).toBe("both");
  });
});

describe("setMapStyle", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("changes mapStyle to 'outline'", () => {
    get(store).setMapStyle("outline");
    expect(get(store).mapStyle).toBe("outline");
  });

  it("changes mapStyle to 'heat'", () => {
    get(store).setMapStyle("outline");
    get(store).setMapStyle("heat");
    expect(get(store).mapStyle).toBe("heat");
  });
});

// ---------------------------------------------------------------------------
// Theme + persistence
// ---------------------------------------------------------------------------

describe("setTheme — updates + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("updates theme to 'light'", () => {
    get(store).setTheme("light");
    expect(get(store).theme).toBe("light");
  });

  it("persists theme via client.saveSingleton('theme', 'light')", () => {
    get(store).setTheme("light");
    expect(client.saveSingleton).toHaveBeenCalledWith("theme", "light");
  });

  it("updates theme to 'dark'", () => {
    get(store).setTheme("dark");
    expect(get(store).theme).toBe("dark");
  });

  it("persists theme 'dark' via saveSingleton", () => {
    get(store).setTheme("dark");
    expect(client.saveSingleton).toHaveBeenCalledWith("theme", "dark");
  });
});

// ---------------------------------------------------------------------------
// setOpacity — updates settings + persists
// ---------------------------------------------------------------------------

describe("setOpacity — updates + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("updates settings.opacity", () => {
    get(store).setOpacity(0.7);
    expect(get(store).settings.opacity).toBe(0.7);
  });

  it("persists settings via saveSingleton('settings', ...)", () => {
    get(store).setOpacity(0.7);
    expect(client.saveSingleton).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ opacity: 0.7 }),
    );
  });
});

// ---------------------------------------------------------------------------
// setWallpaper — updates settings + persists
// ---------------------------------------------------------------------------

describe("setWallpaper — updates + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("updates settings.wallpaper", () => {
    get(store).setWallpaper("dusk");
    expect(get(store).settings.wallpaper).toBe("dusk");
  });

  it("persists settings via saveSingleton('settings', ...)", () => {
    get(store).setWallpaper("dusk");
    expect(client.saveSingleton).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ wallpaper: "dusk" }),
    );
  });
});

// ---------------------------------------------------------------------------
// setSetting — generic setting update + persists
// ---------------------------------------------------------------------------

describe("setSetting — updates + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("updates openAtStartup", () => {
    get(store).setSetting("openAtStartup", false);
    expect(get(store).settings.openAtStartup).toBe(false);
  });

  it("persists settings after setSetting", () => {
    get(store).setSetting("openAtStartup", false);
    expect(client.saveSingleton).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ openAtStartup: false }),
    );
  });

  it("updates minimizedByDefault", () => {
    get(store).setSetting("minimizedByDefault", true);
    expect(get(store).settings.minimizedByDefault).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setInterval — clamps within domain range (20–90) + persists
// ---------------------------------------------------------------------------

describe("setInterval — clamps + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("sets interval within range", () => {
    get(store).setInterval(60);
    expect(get(store).settings.interval).toBe(60);
  });

  it("clamps interval at minimum (20)", () => {
    get(store).setInterval(5);
    expect(get(store).settings.interval).toBe(20);
  });

  it("clamps interval at maximum (90)", () => {
    get(store).setInterval(200);
    expect(get(store).settings.interval).toBe(90);
  });

  it("persists settings via saveSingleton('settings', ...)", () => {
    get(store).setInterval(60);
    expect(client.saveSingleton).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ interval: 60 }),
    );
  });
});

// ---------------------------------------------------------------------------
// setIdleNudge — clamps within domain range (10–180) + persists
// ---------------------------------------------------------------------------

describe("setIdleNudge — clamps + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("sets idleNudge within range", () => {
    get(store).setIdleNudge(60);
    expect(get(store).settings.idleNudge).toBe(60);
  });

  it("clamps idleNudge at minimum (10)", () => {
    get(store).setIdleNudge(2);
    expect(get(store).settings.idleNudge).toBe(10);
  });

  it("clamps idleNudge at maximum (180)", () => {
    get(store).setIdleNudge(999);
    expect(get(store).settings.idleNudge).toBe(180);
  });

  it("persists settings via saveSingleton('settings', ...)", () => {
    get(store).setIdleNudge(60);
    expect(client.saveSingleton).toHaveBeenCalledWith(
      "settings",
      expect.objectContaining({ idleNudge: 60 }),
    );
  });
});

// ---------------------------------------------------------------------------
// openSettings / closeSettings
// ---------------------------------------------------------------------------

describe("openSettings / closeSettings", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("openSettings sets settingsOpen=true", () => {
    get(store).openSettings();
    expect(get(store).settingsOpen).toBe(true);
  });

  it("closeSettings sets settingsOpen=false", () => {
    get(store).openSettings();
    get(store).closeSettings();
    expect(get(store).settingsOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// exportData / importData
// ---------------------------------------------------------------------------

describe("exportData", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("calls client.exportData() and returns string", async () => {
    const result = await get(store).exportData();
    expect(client.exportData).toHaveBeenCalledOnce();
    expect(typeof result).toBe("string");
  });
});

describe("importData", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("calls client.importData() with the json string", async () => {
    const json = '{"app":"Nabd","version":1}';
    await get(store).importData(json);
    expect(client.importData).toHaveBeenCalledWith(json);
  });
});

// ---------------------------------------------------------------------------
// Session flow: startNext → openActive → logSet → closeActive
// ---------------------------------------------------------------------------

describe("startNext", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("sets activeSession", () => {
    get(store).startNext();
    expect(get(store).activeSession).not.toBeNull();
  });

  it("activeSession.exercise matches current slot's exercise", () => {
    get(store).startNext();
    const sess = get(store).activeSession!;
    expect(sess.exercise).toBe("Barbell Bench Press");
  });

  it("activeSession.slotId matches the 'now' slot", () => {
    get(store).startNext();
    const nowSlot = get(store).slots.find((s) => s.status === "now");
    const sess = get(store).activeSession!;
    expect(sess.slotId).toBe(nowSlot?.id);
  });
});

describe("openActive", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("opens a session for a given slotId", () => {
    const slotId = get(store).slots[0].id;
    get(store).openActive(slotId);
    expect(get(store).activeSession).not.toBeNull();
    expect(get(store).activeSession!.slotId).toBe(slotId);
  });
});

describe("switchExercise", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    // Build a multi-exercise program for switching
    const multiProgram: Program = {
      name: "Multi",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "multi-day",
          name: "Multi",
          weekday: 3,
          slots: [],
          exercises: [
            {
              id: "ex1",
              exId: "bb-bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8, b: 12 },
                { type: "working", a: 8, b: 12 },
              ],
            },
            {
              id: "ex2",
              exId: "back-squat",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 6, b: 10 },
                { type: "working", a: 6, b: 10 },
              ],
            },
          ],
        },
      ],
    };

    const snapshot: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      program: multiProgram,
    };

    const client = makeFakeClient(snapshot);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();

    // Open a session on slot 0
    const slotId = get(store).slots[0].id;
    get(store).openActive(slotId);
  });

  it("switches session to a different slot's exercise", () => {
    const slots = get(store).slots;
    expect(slots.length).toBeGreaterThanOrEqual(2);
    const secondSlotId = slots[1].id;
    get(store).switchExercise(secondSlotId);
    expect(get(store).activeSession!.slotId).toBe(secondSlotId);
    expect(get(store).activeSession!.exercise).toBe("Back Squat");
  });
});

describe("stepReps / stepWeight", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).startNext();
  });

  it("stepReps(+1) increments reps by 1", () => {
    const before = get(store).activeSession!.reps;
    get(store).stepReps(1);
    expect(get(store).activeSession!.reps).toBe(before + 1);
  });

  it("stepReps(-1) decrements reps by 1 (clamped at 1)", () => {
    // Set reps high enough to decrement
    get(store).stepReps(5);
    const before = get(store).activeSession!.reps;
    get(store).stepReps(-1);
    expect(get(store).activeSession!.reps).toBe(Math.max(1, before - 1));
  });

  it("stepWeight(+1) increases weight by 2.5", () => {
    const before = get(store).activeSession!.weight;
    get(store).stepWeight(1);
    expect(get(store).activeSession!.weight).toBeCloseTo(before + 2.5, 1);
  });

  it("stepWeight(-1) decreases weight by 2.5 (clamped at 0)", () => {
    get(store).stepWeight(10); // pump weight up
    const before = get(store).activeSession!.weight;
    get(store).stepWeight(-1);
    expect(get(store).activeSession!.weight).toBeCloseTo(Math.max(0, before - 2.5), 1);
  });
});

describe("closeActive", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).startNext();
  });

  it("sets activeSession to null", () => {
    get(store).closeActive();
    expect(get(store).activeSession).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// logSet — the anti-stub crown jewel
// ---------------------------------------------------------------------------

describe("logSet — manual trigger", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).startNext();
    vi.clearAllMocks();
  });

  it("calls client.appendSet with a LoggedSet", async () => {
    await get(store).logSet("manual");
    expect(client.appendSet).toHaveBeenCalledOnce();
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.exId).toBe("bb-bench");
    expect(row.trigger).toBe("manual");
    expect(row.exercise).toBe("Barbell Bench Press");
  });

  it("logged set has correct date (2026-06-24)", async () => {
    await get(store).logSet("manual");
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.date).toBe("2026-06-24");
  });

  it("logged set has correct ts (fixed now ISO string)", async () => {
    await get(store).logSet("manual");
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.ts).toBe(FIXED_NOW.toISOString());
  });

  it("logged set has a unique id from newId()", async () => {
    await get(store).logSet("manual");
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.id).toMatch(/^test-id-\d+$/);
  });

  it("logged set has correct muscles from exercise", async () => {
    await get(store).logSet("manual");
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.muscles).toContain("chest");
  });

  it("increments slot.done by 1", async () => {
    const slotsBefore = get(store).slots;
    const slot = slotsBefore[0];
    const doneBefore = slot.done;
    await get(store).logSet("manual");
    const slotsAfter = get(store).slots;
    const updatedSlot = slotsAfter.find((s) => s.id === slot.id)!;
    expect(updatedSlot.done).toBe(doneBefore + 1);
  });

  it("appends logged set to history", async () => {
    const histBefore = get(store).history.length;
    await get(store).logSet("manual");
    expect(get(store).history.length).toBe(histBefore + 1);
  });

  it("updates coverage (chest bumped after bench press logged)", async () => {
    const covBefore = get(store).coverage.chest;
    await get(store).logSet("manual");
    expect(get(store).coverage.chest).toBeGreaterThan(covBefore);
  });

  it("persists dayState via saveSingleton('dayState', ...)", async () => {
    await get(store).logSet("manual");
    expect(client.saveSingleton).toHaveBeenCalledWith("dayState", expect.any(Object));
  });
});

describe("logSet — with 'timer' trigger", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).startNext();
    vi.clearAllMocks();
  });

  it("passes 'timer' as trigger to appendSet", async () => {
    await get(store).logSet("timer");
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.trigger).toBe("timer");
  });
});

describe("logSet — with 'idle' trigger", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).startNext();
    vi.clearAllMocks();
  });

  it("passes 'idle' as trigger to appendSet", async () => {
    await get(store).logSet("idle");
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.trigger).toBe("idle");
  });
});

describe("logSet — no trigger argument (defaults to 'manual')", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).startNext();
    vi.clearAllMocks();
  });

  it("defaults trigger to 'manual' when omitted", async () => {
    await get(store).logSet();
    const row = (client.appendSet as MockedFunction<IpcClient["appendSet"]>).mock.calls[0][0];
    expect(row.trigger).toBe("manual");
  });
});

describe("logSet — no-op when activeSession is null (guard branch)", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(() => {
    client = makeFakeClient();
    store = makeStore(makeDeps(client));
    // Do NOT call hydrate() or startNext() — activeSession stays null
  });

  it("returns immediately without calling client.appendSet when activeSession is null", async () => {
    expect(get(store).activeSession).toBeNull();
    await get(store).logSet();
    expect(client.appendSet).not.toHaveBeenCalled();
  });

  it("leaves activeSession null after logSet when no session is active", async () => {
    await get(store).logSet();
    expect(get(store).activeSession).toBeNull();
  });

  it("leaves history unchanged (empty) after logSet when no session is active", async () => {
    await get(store).logSet();
    expect(get(store).history).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// tick — timer fire → notif
// ---------------------------------------------------------------------------

describe("tick — timer fires notif when secondsToNext reaches 0", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Ensure no active session (busy=false) and no existing notif
  });

  it("decrements secondsToNext by 1 on each tick", () => {
    const before = get(store).secondsToNext;
    get(store).tick();
    expect(get(store).secondsToNext).toBe(before - 1);
  });

  it("raises a 'timer' notif when secondsToNext reaches 0", () => {
    // Drive the store directly to one tick before firing.
    // idleSeconds=0 keeps idle well below idleNudge (25) so it won't fire on
    // this single tick regardless of the initial secondsToNext value.
    store.setState({ secondsToNext: 1, idleSeconds: 0 });
    expect(get(store).notif).toBeNull();
    // One tick → secondsToNext hits 0 → timer fires
    get(store).tick();
    expect(get(store).notif).not.toBeNull();
    expect(get(store).notif!.reason).toBe("timer");
    expect(get(store).notif!.slot).toBeDefined();
  });

  it("increments idleSeconds by 1 on each tick", () => {
    const before = get(store).idleSeconds;
    get(store).tick();
    expect(get(store).idleSeconds).toBe(before + 1);
  });
});

describe("tick — idle notif when idleSeconds >= idleNudge", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    // Use settings with small idleNudge so we can reach threshold quickly
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      settings: { ...FIXTURE_SETTINGS, idleNudge: 3, interval: 90 },
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("raises 'idle' notif when idleSeconds >= idleNudge threshold", () => {
    // Tick 3 times — idleSeconds will reach 3 = idleNudge; secondsToNext won't be 0 (interval=90*60)
    get(store).tick();
    get(store).tick();
    get(store).tick();
    // At this point idleSeconds >= idleNudge → idle notif
    const notif = get(store).notif;
    expect(notif).not.toBeNull();
    expect(notif!.reason).toBe("idle");
  });
});

describe("tick — busy (active session) suppresses notif", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      settings: { ...FIXTURE_SETTINGS, idleNudge: 1, interval: 90 },
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Open a session to make busy=true
    get(store).startNext();
  });

  it("does not raise notif when session is active (busy)", () => {
    get(store).tick();
    get(store).tick();
    // busy=true → no new notif
    expect(get(store).notif).toBeNull();
  });
});

describe("tick — existing notif suppresses new notif", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      settings: { ...FIXTURE_SETTINGS, idleNudge: 1, interval: 90 },
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Fire idle notif
    get(store).tick(); // idleSeconds=1 >= idleNudge=1 → notif raised
  });

  it("keeps the existing notif, does not overwrite it", () => {
    const notifBefore = get(store).notif;
    expect(notifBefore).not.toBeNull();
    get(store).tick(); // Another tick — notif should not change
    expect(get(store).notif).toEqual(notifBefore);
  });
});

// ---------------------------------------------------------------------------
// resetIdle / snooze / confirmNotif
// ---------------------------------------------------------------------------

describe("resetIdle", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).tick();
    get(store).tick();
    get(store).tick();
  });

  it("resets idleSeconds to 0", () => {
    expect(get(store).idleSeconds).toBeGreaterThan(0);
    get(store).resetIdle();
    expect(get(store).idleSeconds).toBe(0);
  });
});

describe("snooze", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      settings: { ...FIXTURE_SETTINGS, idleNudge: 1 },
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).tick(); // raise idle notif
  });

  it("clears the notif", () => {
    expect(get(store).notif).not.toBeNull();
    get(store).snooze();
    expect(get(store).notif).toBeNull();
  });

  it("resets idleSeconds to 0", () => {
    get(store).snooze();
    expect(get(store).idleSeconds).toBe(0);
  });

  it("resets secondsToNext to snooze duration (5 min = 300)", () => {
    get(store).snooze();
    expect(get(store).secondsToNext).toBe(300);
  });
});

describe("confirmNotif", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      settings: { ...FIXTURE_SETTINGS, idleNudge: 1 },
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).tick(); // raise idle notif
  });

  it("clears notif and opens the session for notif.slot.id", () => {
    const notifSlotId = get(store).notif!.slot.id;
    get(store).confirmNotif();
    expect(get(store).notif).toBeNull();
    expect(get(store).activeSession).not.toBeNull();
    expect(get(store).activeSession!.slotId).toBe(notifSlotId);
  });
});

// ---------------------------------------------------------------------------
// Planner actions — program mutations + saveSingleton("program")
// ---------------------------------------------------------------------------

describe("planAddDay — adds day + persists program", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("adds a new day to the program", () => {
    const daysBefore = get(store).program.days.length;
    get(store).planAddDay(null);
    expect(get(store).program.days.length).toBe(daysBefore + 1);
  });

  it("persists program via saveSingleton('program', ...)", () => {
    get(store).planAddDay(null);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planRemoveDay — removes day + persists program", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("removes a day from the program", () => {
    const dayId = get(store).program.days[0].id;
    const daysBefore = get(store).program.days.length;
    get(store).planRemoveDay(dayId);
    expect(get(store).program.days.length).toBe(daysBefore - 1);
    expect(get(store).program.days.find((d) => d.id === dayId)).toBeUndefined();
  });

  it("persists program via saveSingleton('program', ...)", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planRemoveDay(dayId);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planRenameDay — renames day + persists program", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("renames a day", () => {
    const day = get(store).program.days[0];
    get(store).planRenameDay(day.id, "Arms Day");
    const renamed = get(store).program.days.find((d) => d.id === day.id)!;
    expect(renamed.name).toBe("Arms Day");
  });

  it("persists program", () => {
    const day = get(store).program.days[0];
    get(store).planRenameDay(day.id, "Arms Day");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planSetWeekday — sets weekday + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("sets the weekday for a day", () => {
    const day = get(store).program.days[0];
    get(store).planSetWeekday(day.id, 5);
    const updated = get(store).program.days.find((d) => d.id === day.id)!;
    expect(updated.weekday).toBe(5);
  });

  it("persists program", () => {
    const day = get(store).program.days[0];
    get(store).planSetWeekday(day.id, 5);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planSetType — switches between 'fixed' and 'cycled' + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("changes program.type to 'cycled'", () => {
    get(store).planSetType("cycled");
    expect(get(store).program.type).toBe("cycled");
  });

  it("persists program when switching to cycled", () => {
    get(store).planSetType("cycled");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });

  it("changes program.type back to 'fixed'", () => {
    get(store).planSetType("cycled");
    vi.clearAllMocks();
    get(store).planSetType("fixed");
    expect(get(store).program.type).toBe("fixed");
  });

  it("persists program when switching to fixed", () => {
    get(store).planSetType("cycled");
    vi.clearAllMocks();
    get(store).planSetType("fixed");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planSetSchedule — switches schedule + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("changes program.schedule to 'floating'", () => {
    get(store).planSetSchedule("floating");
    expect(get(store).program.schedule).toBe("floating");
  });

  it("persists program", () => {
    get(store).planSetSchedule("floating");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planSetProfile — changes activeProfileId", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("changes activeProfileId to 'commercial'", () => {
    get(store).planSetProfile("commercial");
    expect(get(store).activeProfileId).toBe("commercial");
  });

  it("changes activeProfileId to 'home'", () => {
    get(store).planSetProfile("home");
    expect(get(store).activeProfileId).toBe("home");
  });
});

describe("planSelectDay — sets planEditDay", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("sets planEditDay to the given dayId", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planSelectDay(dayId);
    expect(get(store).planEditDay).toBe(dayId);
  });
});

describe("toggleProfileMenu", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("toggles profileMenu from false to true", () => {
    expect(get(store).profileMenu).toBe(false);
    get(store).toggleProfileMenu();
    expect(get(store).profileMenu).toBe(true);
  });

  it("toggles profileMenu from true to false", () => {
    get(store).toggleProfileMenu();
    get(store).toggleProfileMenu();
    expect(get(store).profileMenu).toBe(false);
  });
});

describe("planAddExercise — adds exercise to day + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("adds an exercise to the program day", () => {
    const dayId = get(store).program.days[0].id;
    const exCountBefore = get(store).program.days[0].exercises.length;
    get(store).planAddExercise(dayId, "pullup");
    expect(get(store).program.days[0].exercises.length).toBe(exCountBefore + 1);
    expect(get(store).program.days[0].exercises.some((e) => e.exId === "pullup")).toBe(true);
  });

  it("persists program", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planAddExercise(dayId, "pullup");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planRemoveExercise — removes exercise from day + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("removes an exercise from the program day", () => {
    const day = get(store).program.days[0];
    const rowId = day.exercises[0].id;
    const exCountBefore = day.exercises.length;
    get(store).planRemoveExercise(day.id, rowId);
    expect(get(store).program.days[0].exercises.length).toBe(exCountBefore - 1);
  });

  it("persists program", () => {
    const day = get(store).program.days[0];
    const rowId = day.exercises[0].id;
    get(store).planRemoveExercise(day.id, rowId);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planToggleSuperset — toggles superset + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    // Need at least 2 exercises to superset
    const multiProgram: Program = {
      name: "Multi",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "multi-day",
          name: "Multi",
          weekday: 3,
          slots: [],
          exercises: [
            {
              id: "ex1",
              exId: "bb-bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "ex2",
              exId: "pullup",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 6, b: 10 }],
            },
          ],
        },
      ],
    };
    const snap: BootSnapshot = { ...BOOT_SNAPSHOT_FULL, program: multiProgram };
    client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("creates a supersetId on linked exercises", () => {
    const day = get(store).program.days[0];
    get(store).planToggleSuperset(day.id, "ex1");
    const updatedDay = get(store).program.days[0];
    const e1 = updatedDay.exercises[0];
    const e2 = updatedDay.exercises[1];
    expect(typeof e1.supersetId).toBe("string");
    expect(e1.supersetId!.length).toBeGreaterThan(0);
    expect(e1.supersetId).toBe(e2.supersetId);
  });

  it("persists program", () => {
    const day = get(store).program.days[0];
    get(store).planToggleSuperset(day.id, "ex1");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planAddSlot — adds cycled slot + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const cycledProgram: Program = {
      ...FIXTURE_PROGRAM,
      type: "cycled",
      days: [{ ...FIXTURE_PROGRAM.days[0], exercises: [], slots: [] }],
    };
    const snap: BootSnapshot = { ...BOOT_SNAPSHOT_FULL, program: cycledProgram };
    client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("adds a slot to the day", () => {
    const dayId = get(store).program.days[0].id;
    const slotsBefore = get(store).program.days[0].slots.length;
    get(store).planAddSlot(dayId, "Chest");
    expect(get(store).program.days[0].slots.length).toBe(slotsBefore + 1);
  });

  it("persists program", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planAddSlot(dayId, "Chest");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planRemoveSlot — removes cycled slot + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const cycledProgram: Program = {
      ...FIXTURE_PROGRAM,
      type: "cycled",
      days: [
        {
          ...FIXTURE_PROGRAM.days[0],
          exercises: [],
          slots: [
            {
              id: "slot-1",
              group: "Chest",
              pool: ["bb-bench"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const snap: BootSnapshot = { ...BOOT_SNAPSHOT_FULL, program: cycledProgram };
    client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("removes the slot from the day", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planRemoveSlot(dayId, "slot-1");
    expect(get(store).program.days[0].slots.find((s) => s.id === "slot-1")).toBeUndefined();
  });

  it("persists program", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planRemoveSlot(dayId, "slot-1");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planRemoveFromPool — removes exercise from pool + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const cycledProgram: Program = {
      ...FIXTURE_PROGRAM,
      type: "cycled",
      days: [
        {
          ...FIXTURE_PROGRAM.days[0],
          exercises: [],
          slots: [
            {
              id: "slot-1",
              group: "Chest",
              pool: ["bb-bench", "pullup"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const snap: BootSnapshot = { ...BOOT_SNAPSHOT_FULL, program: cycledProgram };
    client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("removes exercise from pool", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planRemoveFromPool(dayId, "slot-1", "bb-bench");
    const slot = get(store).program.days[0].slots.find((s) => s.id === "slot-1")!;
    expect(slot.pool).not.toContain("bb-bench");
    expect(slot.pool).toContain("pullup");
  });

  it("persists program", () => {
    const dayId = get(store).program.days[0].id;
    get(store).planRemoveFromPool(dayId, "slot-1", "bb-bench");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

// ---------------------------------------------------------------------------
// planEdit — each op
// ---------------------------------------------------------------------------

describe("planEdit — setRepMode", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("changes repMode and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "setRepMode", 1); // 1 = "fixed" index
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planEdit — setIntensity", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("changes intensity and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "setIntensity", 1);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });

  it("index 0 sets intensity to 'none'", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "setIntensity", 0);
    const ex = get(store).program.days[0].exercises.find((e) => e.id === exId)!;
    expect(ex.intensity).toBe("none");
  });

  it("index 1 sets intensity to 'rpe'", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "setIntensity", 1);
    const ex = get(store).program.days[0].exercises.find((e) => e.id === exId)!;
    expect(ex.intensity).toBe("rpe");
  });

  // BUG 1: index 2 should produce "pct" (the domain Intensity value) but current
  // code maps it to "percent" — this test FAILS against current code
  it("index 2 sets intensity to 'pct' (domain enum value) [BUG: current code produces 'percent']", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "setIntensity", 2);
    const ex = get(store).program.days[0].exercises.find((e) => e.id === exId)!;
    expect(ex.intensity).toBe("pct");
  });
});

describe("planEdit — setRest", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("adjusts rest and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const restBefore = day.exercises[0].rest;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "setRest", 1);
    const restAfter = get(store).program.days[0].exercises[0].rest;
    expect(restAfter).toBe(restBefore + 15);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planEdit — addSet", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("adds a set and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const setsBefore = day.exercises[0].sets.length;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "addSet");
    expect(get(store).program.days[0].exercises[0].sets.length).toBe(setsBefore + 1);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planEdit — addWarmup", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("adds a warmup set at the front and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const setsBefore = day.exercises[0].sets.length;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "addWarmup");
    expect(get(store).program.days[0].exercises[0].sets.length).toBe(setsBefore + 1);
    expect(get(store).program.days[0].exercises[0].sets[0].type).toBe("warmup");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planEdit — removeSet", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("removes a set and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const setsBefore = day.exercises[0].sets.length;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "removeSet", 0);
    expect(get(store).program.days[0].exercises[0].sets.length).toBe(setsBefore - 1);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planEdit — cycleSetType", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("cycles the set type of a set and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const typeBefore = day.exercises[0].sets[0].type;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "cycleSetType", 0);
    const typeAfter = get(store).program.days[0].exercises[0].sets[0].type;
    expect(typeAfter).not.toBe(typeBefore);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planEdit — stepRep", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("steps rep value up and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const aBefore = day.exercises[0].sets[0].a;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "stepRep", 0, 1, 1); // set 0, which=1 (a), delta=1
    const aAfter = get(store).program.days[0].exercises[0].sets[0].a;
    expect(aAfter).toBe(aBefore + 1);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });

  // BUG 2: which=1 → 'a', which=0 → 'b'; current code hardcodes 'a', so 'b' never changes
  it("which=1 steps 'a' upward (a increases, b unchanged)", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    // Fixture exercise has range sets: { a: 8, b: 12 }
    const aBefore = day.exercises[0].sets[0].a;
    const bBefore = day.exercises[0].sets[0].b!;
    // planEdit(..., "stepRep", setIndex=0, which=1→'a', delta=+1)
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "stepRep", 0, 1, 1);
    const aAfter = get(store).program.days[0].exercises[0].sets[0].a;
    const bAfter = get(store).program.days[0].exercises[0].sets[0].b!;
    expect(aAfter).toBe(aBefore + 1);
    expect(bAfter).toBe(bBefore); // b must NOT change when stepping 'a'
  });

  // BUG 2: which=0 → 'b'; current code hardcodes 'a' so 'b' doesn't change — this test FAILS against current code
  it("which=0 steps 'b' upward (b increases, a unchanged) [BUG: current code hardcodes 'a']", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    // Fixture exercise has range sets: { a: 8, b: 12 }
    const aBefore = day.exercises[0].sets[0].a;
    const bBefore = day.exercises[0].sets[0].b!;
    // planEdit(..., "stepRep", setIndex=0, which=0→'b', delta=+1)
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "stepRep", 0, 0, 1);
    const aAfter = get(store).program.days[0].exercises[0].sets[0].a;
    const bAfter = get(store).program.days[0].exercises[0].sets[0].b!;
    expect(bAfter).toBe(bBefore + 1); // b must increase by 1
    expect(aAfter).toBe(aBefore);     // a must NOT change when stepping 'b'
  });
});

describe("planEdit — stepVal", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    // Need exercise with intensity set
    const progWithIntensity: Program = {
      ...FIXTURE_PROGRAM,
      days: [
        {
          ...FIXTURE_PROGRAM.days[0],
          exercises: [
            {
              id: "ex-intensity",
              exId: "bb-bench",
              repMode: "range",
              intensity: "rpe",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12, val: 8 }],
            },
          ],
        },
      ],
    };
    const snap: BootSnapshot = { ...BOOT_SNAPSHOT_FULL, program: progWithIntensity };
    client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("steps intensity value and persists", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    const valBefore = day.exercises[0].sets[0].val!;
    get(store).planEdit(day.id, { kind: "ex", id: exId }, "stepVal", 0, 1);
    const valAfter = get(store).program.days[0].exercises[0].sets[0].val!;
    expect(valAfter).toBeGreaterThan(valBefore);
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("planSetNotes — sets notes + persists", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
  });

  it("sets notes on an exercise", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planSetNotes(day.id, { kind: "ex", id: exId }, "Focus on stretch");
    const updatedEx = get(store).program.days[0].exercises[0];
    expect(updatedEx.notes).toBe("Focus on stretch");
  });

  it("persists program", () => {
    const day = get(store).program.days[0];
    const exId = day.exercises[0].id;
    get(store).planSetNotes(day.id, { kind: "ex", id: exId }, "Focus on stretch");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

// ---------------------------------------------------------------------------
// Library modal actions
// ---------------------------------------------------------------------------

describe("libOpen / libClose", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("libOpen sets lib.open=true and lib.target", () => {
    get(store).libOpen({ kind: "ex", dayId: "push-day" });
    expect(get(store).lib.open).toBe(true);
    expect(get(store).lib.target).toEqual({ kind: "ex", dayId: "push-day" });
  });

  it("libClose sets lib.open=false", () => {
    get(store).libOpen({ kind: "ex", dayId: "push-day" });
    get(store).libClose();
    expect(get(store).lib.open).toBe(false);
  });
});

describe("libSearch", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("updates lib.search", () => {
    get(store).libSearch("bench");
    expect(get(store).lib.search).toBe("bench");
  });
});

describe("libGroup", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("updates lib.group", () => {
    get(store).libGroup("Chest");
    expect(get(store).lib.group).toBe("Chest");
  });
});

describe("libStartCreate / libCancelCreate", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("libStartCreate sets lib.creating=true", () => {
    get(store).libStartCreate();
    expect(get(store).lib.creating).toBe(true);
  });

  it("libCancelCreate sets lib.creating=false", () => {
    get(store).libStartCreate();
    get(store).libCancelCreate();
    expect(get(store).lib.creating).toBe(false);
  });
});

describe("libDraft", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("updates lib.draft.name", () => {
    get(store).libDraft("name", "My Custom Exercise");
    expect(get(store).lib.draft.name).toBe("My Custom Exercise");
  });

  it("updates lib.draft.group", () => {
    get(store).libDraft("group", "Chest");
    expect(get(store).lib.draft.group).toBe("Chest");
  });

  it("updates lib.draft.equip", () => {
    get(store).libDraft("equip", "dumbbell");
    expect(get(store).lib.draft.equip).toBe("dumbbell");
  });
});

describe("libToggleSecondary", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("adds a secondary muscle to draft", () => {
    get(store).libToggleSecondary("biceps");
    expect(get(store).lib.draft.secondary).toContain("biceps");
  });

  it("removes a secondary muscle if already present", () => {
    get(store).libToggleSecondary("biceps");
    get(store).libToggleSecondary("biceps");
    expect(get(store).lib.draft.secondary).not.toContain("biceps");
  });
});

describe("libPick — adds exercise to program day + closes lib", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();
    // Open lib targeting ex
    const dayId = get(store).program.days[0].id;
    get(store).libOpen({ kind: "ex", dayId });
  });

  it("adds exercise to day.exercises", () => {
    const dayId = get(store).program.days[0].id;
    const exCountBefore = get(store).program.days[0].exercises.length;
    get(store).libPick("pullup");
    expect(get(store).program.days[0].exercises.length).toBe(exCountBefore + 1);
    expect(get(store).program.days[0].exercises.some((e) => e.exId === "pullup")).toBe(true);
  });

  it("closes the library modal", () => {
    get(store).libPick("pullup");
    expect(get(store).lib.open).toBe(false);
  });

  it("persists program via saveSingleton('program', ...)", () => {
    get(store).libPick("pullup");
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });
});

describe("libCreate — creates custom exercise + persists customExercises + calls libPick", () => {
  let client: IpcClient;
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    vi.clearAllMocks();

    const dayId = get(store).program.days[0].id;
    get(store).libOpen({ kind: "ex", dayId });
    get(store).libStartCreate();
    get(store).libDraft("name", "Dragon Flag");
    get(store).libDraft("group", "Abs");
    get(store).libDraft("equip", "bodyweight");
  });

  it("adds a custom exercise to customExercises", () => {
    const before = get(store).customExercises.length;
    get(store).libCreate();
    expect(get(store).customExercises.length).toBe(before + 1);
    expect(get(store).customExercises.some((e) => e.name === "Dragon Flag")).toBe(true);
  });

  it("custom exercise has custom=true", () => {
    get(store).libCreate();
    const ex = get(store).customExercises.find((e) => e.name === "Dragon Flag")!;
    expect(ex.custom).toBe(true);
  });

  it("persists customExercises via saveSingleton('customExercises', ...)", () => {
    get(store).libCreate();
    expect(client.saveSingleton).toHaveBeenCalledWith(
      "customExercises",
      expect.arrayContaining([expect.objectContaining({ name: "Dragon Flag" })]),
    );
  });

  it("also persists program (via libPick which adds it to day)", () => {
    get(store).libCreate();
    expect(client.saveSingleton).toHaveBeenCalledWith("program", expect.any(Object));
  });

  it("closes the library modal", () => {
    get(store).libCreate();
    expect(get(store).lib.open).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

describe("setProgTab", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("changes progTab to 'weekly'", () => {
    get(store).setProgTab("weekly");
    expect(get(store).progTab).toBe("weekly");
  });

  it("changes progTab back to 'calendar'", () => {
    get(store).setProgTab("weekly");
    get(store).setProgTab("calendar");
    expect(get(store).progTab).toBe("calendar");
  });
});

describe("openProgChart / closeProgChart", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
  });

  it("openProgChart sets progExercise to the given index", () => {
    get(store).openProgChart(3);
    expect(get(store).progExercise).toBe(3);
  });

  it("closeProgChart sets progExercise to null", () => {
    get(store).openProgChart(3);
    get(store).closeProgChart();
    expect(get(store).progExercise).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setIdleSeconds — authoritative OS-idle update: sets idleSeconds + may raise
// idle notif (mirrors the idle branch of tick but WITHOUT touching secondsToNext)
// ---------------------------------------------------------------------------

describe("setIdleSeconds — sets idleSeconds, below threshold: no notif", () => {
  // FIXTURE_SETTINGS has idleNudge=25. Passing 12 is below threshold.
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Preconditions: no active session, no notif, slots populated (currentSlot != null)
    expect(get(store).activeSession).toBeNull();
    expect(get(store).notif).toBeNull();
    expect(get(store).slots.length).toBeGreaterThan(0);
  });

  it("sets idleSeconds to the given value (12)", () => {
    get(store).setIdleSeconds(12);
    expect(get(store).idleSeconds).toBe(12);
  });

  it("does NOT raise a notif when seconds < idleNudge (12 < 25)", () => {
    get(store).setIdleSeconds(12);
    expect(get(store).notif).toBeNull();
  });

  it("does NOT touch secondsToNext", () => {
    const stsBefore = get(store).secondsToNext;
    get(store).setIdleSeconds(12);
    expect(get(store).secondsToNext).toBe(stsBefore);
  });
});

describe("setIdleSeconds — above threshold with current slot: raises idle notif", () => {
  // FIXTURE_SETTINGS has idleNudge=25. Passing 30 (>= 25) should fire.
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Preconditions: no active session, no notif, currentSlot exists (push-day Wednesday)
    expect(get(store).activeSession).toBeNull();
    expect(get(store).notif).toBeNull();
    expect(get(store).slots.length).toBeGreaterThan(0);
  });

  it("sets idleSeconds to the given value (30)", () => {
    get(store).setIdleSeconds(30);
    expect(get(store).idleSeconds).toBe(30);
  });

  it("raises a notif with reason 'idle'", () => {
    get(store).setIdleSeconds(30);
    expect(get(store).notif).not.toBeNull();
    expect(get(store).notif!.reason).toBe("idle");
  });

  it("notif.slot matches the current slot", () => {
    get(store).setIdleSeconds(30);
    const cs = get(store).slots.find((s) => s.status === "now")!;
    expect(get(store).notif!.slot.id).toBe(cs.id);
  });

  it("does NOT touch secondsToNext when raising the notif", () => {
    const stsBefore = get(store).secondsToNext;
    get(store).setIdleSeconds(30);
    expect(get(store).secondsToNext).toBe(stsBefore);
  });

  it("fires at exactly the threshold (idleNudge=25)", () => {
    get(store).setIdleSeconds(25);
    expect(get(store).notif).not.toBeNull();
    expect(get(store).notif!.reason).toBe("idle");
  });
});

describe("setIdleSeconds — active session open (busy): no notif, but idleSeconds is still set", () => {
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const client = makeFakeClient(BOOT_SNAPSHOT_FULL);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Open a session to make busy=true
    get(store).startNext();
    expect(get(store).activeSession).not.toBeNull();
  });

  it("still sets idleSeconds to the given value", () => {
    get(store).setIdleSeconds(30);
    expect(get(store).idleSeconds).toBe(30);
  });

  it("does NOT raise a notif while a session is active", () => {
    get(store).setIdleSeconds(30);
    expect(get(store).notif).toBeNull();
  });

  it("does NOT touch secondsToNext", () => {
    const stsBefore = get(store).secondsToNext;
    get(store).setIdleSeconds(30);
    expect(get(store).secondsToNext).toBe(stsBefore);
  });
});

describe("setIdleSeconds — existing notif present: no new/changed notif, idleSeconds still set", () => {
  // Raise an existing notif first (via tick at idleNudge=1), then call setIdleSeconds.
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      settings: { ...FIXTURE_SETTINGS, idleNudge: 1, interval: 90 },
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    get(store).tick(); // idleSeconds=1 >= idleNudge=1 → raises idle notif
    expect(get(store).notif).not.toBeNull();
  });

  it("still sets idleSeconds to the new value", () => {
    get(store).setIdleSeconds(50);
    expect(get(store).idleSeconds).toBe(50);
  });

  it("does NOT overwrite the existing notif", () => {
    const notifBefore = get(store).notif;
    get(store).setIdleSeconds(50);
    expect(get(store).notif).toEqual(notifBefore);
  });

  it("does NOT touch secondsToNext", () => {
    const stsBefore = get(store).secondsToNext;
    get(store).setIdleSeconds(50);
    expect(get(store).secondsToNext).toBe(stsBefore);
  });
});

describe("setIdleSeconds — no current slot (empty slots): no notif even above threshold", () => {
  // Use a snapshot with no matching weekday day → slots stays empty → currentSlot returns null
  let store: StoreApi<NabdStore>;

  beforeEach(async () => {
    // A program with a day on Monday only; FIXED_NOW is Wednesday → no match → slots=[]
    const mondayProgram: Program = {
      name: "Monday Only",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "monday-day",
          name: "Monday",
          weekday: 1, // Monday — Wednesday (3) won't match
          slots: [],
          exercises: [
            {
              id: "ex-mon",
              exId: "bb-bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const snap: BootSnapshot = {
      ...BOOT_SNAPSHOT_FULL,
      program: mondayProgram,
    };
    const client = makeFakeClient(snap);
    store = makeStore(makeDeps(client));
    await get(store).hydrate();
    // Verify no current slot
    expect(get(store).slots.length).toBe(0);
    expect(get(store).notif).toBeNull();
  });

  it("still sets idleSeconds to the given value", () => {
    get(store).setIdleSeconds(30);
    expect(get(store).idleSeconds).toBe(30);
  });

  it("does NOT raise a notif when there is no current slot", () => {
    get(store).setIdleSeconds(30);
    expect(get(store).notif).toBeNull();
  });

  it("does NOT touch secondsToNext", () => {
    const stsBefore = get(store).secondsToNext;
    get(store).setIdleSeconds(30);
    expect(get(store).secondsToNext).toBe(stsBefore);
  });
});
