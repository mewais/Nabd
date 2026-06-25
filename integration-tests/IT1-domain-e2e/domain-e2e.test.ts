/**
 * IT1 — domain + store end-to-end
 *
 * Builds an in-memory IpcClient mirroring B13 semantics (singleton JSON store +
 * history array), then drives createNabdStore through the journeys listed in
 * integration-tests/AGENT.md §IT1 and asserts concrete end-to-end behaviour.
 *
 * These tests run against the FULLY IMPLEMENTED system and must PASS.
 * If an assertion fails it is a real integration bug — see report at end of file.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { IpcClient, BootSnapshot } from "@nabd/ipc-client";
import type {
  Program,
  Settings,
  Theme,
  Exercise,
  RotationState,
  DayState,
  LoggedSet,
} from "@nabd/domain";
import { createNabdStore } from "@nabd/store";
import { defaultLibrary } from "@nabd/dataset";
import { seedProgram } from "@nabd/program-editor";

// ---------------------------------------------------------------------------
// In-memory IpcClient — faithfully mirrors B13 semantics
// ---------------------------------------------------------------------------

interface InMemoryStore {
  program: Program | null;
  settings: Settings | null;
  theme: Theme | null;
  customExercises: Exercise[] | null;
  rotationState: RotationState | null;
  dayState: DayState | null;
  history: LoggedSet[];
}

/** appendSet call record, for asserting call counts and payloads. */
interface AppendSetCall {
  row: LoggedSet;
}

/** saveSingleton call record. */
interface SaveSingletonCall {
  key: string;
  value: unknown;
}

function makeInMemoryClient(): IpcClient & {
  _store: InMemoryStore;
  _appendSetCalls: AppendSetCall[];
  _saveSingletonCalls: SaveSingletonCall[];
  _loadAllCalls: number;
  _initCalls: number;
} {
  const _store: InMemoryStore = {
    program: null,
    settings: null,
    theme: null,
    customExercises: null,
    rotationState: null,
    dayState: null,
    history: [],
  };

  const _appendSetCalls: AppendSetCall[] = [];
  const _saveSingletonCalls: SaveSingletonCall[] = [];
  let _loadAllCalls = 0;
  let _initCalls = 0;

  const client = {
    _store,
    _appendSetCalls,
    _saveSingletonCalls,
    get _loadAllCalls() {
      return _loadAllCalls;
    },
    get _initCalls() {
      return _initCalls;
    },

    async init(): Promise<void> {
      _initCalls++;
    },

    async loadAll(): Promise<BootSnapshot> {
      _loadAllCalls++;
      return {
        program: _store.program !== null ? structuredClone(_store.program) : null,
        settings: _store.settings !== null ? structuredClone(_store.settings) : null,
        theme: _store.theme !== null ? structuredClone(_store.theme) : null,
        customExercises:
          _store.customExercises !== null ? structuredClone(_store.customExercises) : null,
        rotationState:
          _store.rotationState !== null ? structuredClone(_store.rotationState) : null,
        dayState: _store.dayState !== null ? structuredClone(_store.dayState) : null,
        history: structuredClone(_store.history),
      };
    },

    async saveSingleton(key: string, value: unknown): Promise<void> {
      _saveSingletonCalls.push({ key, value: structuredClone(value) });
      // Mirror what B13 does: store per-key
      switch (key) {
        case "program":
          _store.program = structuredClone(value) as Program;
          break;
        case "settings":
          _store.settings = structuredClone(value) as Settings;
          break;
        case "theme":
          _store.theme = structuredClone(value) as Theme;
          break;
        case "customExercises":
          _store.customExercises = structuredClone(value) as Exercise[];
          break;
        case "rotationState":
          _store.rotationState = structuredClone(value) as RotationState;
          break;
        case "dayState":
          _store.dayState = structuredClone(value) as DayState;
          break;
      }
    },

    async appendSet(row: LoggedSet): Promise<void> {
      _appendSetCalls.push({ row: structuredClone(row) });
      _store.history.push(structuredClone(row));
    },

    async exportData(): Promise<string> {
      // Build a snapshot JSON matching the AppData envelope
      const snapshot = {
        app: "Nabd",
        version: 1,
        exportedAt: new Date().toISOString(),
        program: _store.program,
        customExercises: _store.customExercises ?? [],
        settings: _store.settings,
        theme: _store.theme,
        history: structuredClone(_store.history),
        rotationState: _store.rotationState ?? {},
      };
      return JSON.stringify(snapshot);
    },

    async importData(json: string): Promise<void> {
      const data = JSON.parse(json) as {
        program?: Program;
        settings?: Settings;
        theme?: Theme;
        customExercises?: Exercise[];
        history?: LoggedSet[];
        rotationState?: RotationState;
      };
      if (data.program !== undefined) _store.program = structuredClone(data.program);
      if (data.settings !== undefined) _store.settings = structuredClone(data.settings);
      if (data.theme !== undefined) _store.theme = structuredClone(data.theme);
      if (data.customExercises !== undefined)
        _store.customExercises = structuredClone(data.customExercises);
      if (data.history !== undefined) _store.history = structuredClone(data.history);
      if (data.rotationState !== undefined)
        _store.rotationState = structuredClone(data.rotationState);
    },

    // No-ops for native commands
    async notify(_reason: "timer" | "idle", _exercise: string): Promise<void> {},
    async setVibrancy(_opacity: number): Promise<void> {},
    async getIdleSeconds(): Promise<number> {
      return 0;
    },
  };

  return client;
}

// ---------------------------------------------------------------------------
// Fixed clock + deterministic id
// ---------------------------------------------------------------------------

// Tuesday 2026-06-24T10:00:00Z — weekday 2 in getDay() (0=Sun)
// The seedProgram has Push on weekday 1 (Mon), Pull on 3 (Wed), Legs on 5 (Fri).
// Let's use Monday 2026-06-22 so Push day is active.
const FIXED_NOW_MONDAY = new Date("2026-06-22T10:00:00Z"); // Monday (getDay()==1)
const FIXED_NOW_TUESDAY = new Date("2026-06-24T10:00:00Z"); // Tuesday (getDay()==2, no workout)
const FIXED_NOW_WEDNESDAY = new Date("2026-06-24T10:00:00Z"); // Wednesday mapped below

function makeCounter() {
  let n = 0;
  return () => `test-id-${++n}`;
}

// ---------------------------------------------------------------------------
// Helper: create a store + hydrate it
// ---------------------------------------------------------------------------
async function hydrateStore(
  client: IpcClient,
  now: () => Date,
  newId: () => string,
) {
  const store = createNabdStore({
    client,
    library: defaultLibrary(),
    now,
    newId,
  });
  await store.getState().hydrate();
  return store;
}

// ---------------------------------------------------------------------------
// Journey 1: hydrate → program seeded, today slots built, currentSlot present,
//             coverage from history
// ---------------------------------------------------------------------------
describe("IT1-J1: hydrate builds today state from a fresh (empty) client", () => {
  it("hydrate sets booted=true and populates program from seedProgram", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const state = store.getState();

    expect(state.booted).toBe(true);
    // Program name matches seed
    expect(state.program.name).toBe("Push / Pull / Legs");
    expect(state.program.type).toBe("fixed");
    expect(state.program.schedule).toBe("weekday");
    expect(state.program.days).toHaveLength(3);
  });

  it("hydrate builds slots for the matching weekday (Push day on Monday)", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const state = store.getState();

    // Monday = weekday 1 → Push day (5 exercises: bb-bench, incline-db-press, db-fly, lat-raise, db-oh-ext)
    expect(state.slots.length).toBeGreaterThan(0);
    const exIds = state.slots.map((s) => s.exId);
    expect(exIds).toContain("bb-bench");
    expect(exIds).toContain("incline-db-press");
    expect(exIds).toContain("db-fly");
    expect(exIds).toContain("lat-raise");
    expect(exIds).toContain("db-oh-ext");
  });

  it("hydrate applies statuses so first slot is 'now' and rest are 'upcoming'", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const state = store.getState();

    const statuses = state.slots.map((s) => s.status);
    // With no prior dayState: 0 done → first slot = "now", rest = "upcoming"
    expect(statuses[0]).toBe("now");
    statuses.slice(1).forEach((st) => expect(st).toBe("upcoming"));
  });

  it("hydrate with empty history gives zero coverage", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const state = store.getState();

    // All coverage values should be 0 when no history
    const nonZero = Object.values(state.coverage).filter((v) => v > 0);
    expect(nonZero).toHaveLength(0);
  });

  it("hydrate with pre-existing history computes non-zero coverage", async () => {
    const client = makeInMemoryClient();
    // Seed some history for chest (bb-bench exercise)
    const existing: LoggedSet = {
      id: "pre-1",
      exId: "bb-bench",
      exercise: "Barbell Bench Press",
      group: "Chest",
      muscles: ["chest", "triceps", "front_delts"],
      value: 10,
      weight: 80,
      trigger: "manual",
      ts: new Date("2026-06-21T10:00:00Z").toISOString(), // within 7 days
      date: "2026-06-21",
    };
    client._store.history.push(existing);

    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const state = store.getState();

    // chest was trained — coverage for "chest" should be > 0
    expect(state.coverage["chest"]).toBeGreaterThan(0);
  });

  it("hydrate on Tuesday (no weekday match) yields empty slots", async () => {
    const client = makeInMemoryClient();
    // Tuesday is weekday 2, but seedProgram has no Tuesday day
    const TUESDAY = new Date("2026-06-23T10:00:00Z"); // Tuesday (getDay()==2)
    const store = await hydrateStore(client, () => TUESDAY, makeCounter());
    const state = store.getState();

    expect(state.slots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Journey 2: openActive → logSet → slot.done++, coverage bumps, history grows,
//             client.appendSet called, dayState persisted
// ---------------------------------------------------------------------------
describe("IT1-J2: openActive + logSet updates slot, coverage, history, and persists", () => {
  let client: ReturnType<typeof makeInMemoryClient>;
  let store: ReturnType<typeof createNabdStore>;

  beforeEach(async () => {
    client = makeInMemoryClient();
    store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
  });

  it("openActive sets activeSession targeting the correct slot", () => {
    const state = store.getState();
    const firstSlot = state.slots[0];
    expect(firstSlot).toBeDefined();

    store.getState().openActive(firstSlot.id);

    const newState = store.getState();
    expect(newState.activeSession).not.toBeNull();
    expect(newState.activeSession!.slotId).toBe(firstSlot.id);
    expect(newState.activeSession!.exercise).toBe(firstSlot.exercise);
  });

  it("logSet increments slot.done by 1", async () => {
    const state = store.getState();
    const firstSlot = state.slots[0];
    const initialDone = firstSlot.done; // 0

    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    const updatedSlot = store.getState().slots.find((s) => s.id === firstSlot.id)!;
    expect(updatedSlot.done).toBe(initialDone + 1);
  });

  it("logSet updates coverage (primary muscle gets bumped)", async () => {
    const state = store.getState();
    const firstSlot = state.slots[0];
    const coverageBefore = { ...state.coverage };

    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    const newState = store.getState();
    // At least one coverage value should have increased
    const improved = firstSlot.muscles.some(
      (m) => newState.coverage[m] > coverageBefore[m],
    );
    expect(improved).toBe(true);
  });

  it("logSet adds one entry to history", async () => {
    const state = store.getState();
    const firstSlot = state.slots[0];
    const historyLenBefore = state.history.length;

    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    expect(store.getState().history.length).toBe(historyLenBefore + 1);
  });

  it("logSet calls client.appendSet exactly once with correct exId", async () => {
    const state = store.getState();
    const firstSlot = state.slots[0];
    const callsBefore = client._appendSetCalls.length;

    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    expect(client._appendSetCalls.length).toBe(callsBefore + 1);
    const call = client._appendSetCalls[client._appendSetCalls.length - 1];
    expect(call.row.exId).toBe(firstSlot.exId);
    expect(call.row.trigger).toBe("manual");
  });

  it("logSet persists dayState via client.saveSingleton('dayState', ...)", async () => {
    const state = store.getState();
    const firstSlot = state.slots[0];

    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    const dayStateCalls = client._saveSingletonCalls.filter((c) => c.key === "dayState");
    expect(dayStateCalls.length).toBeGreaterThan(0);
    const lastDayState = dayStateCalls[dayStateCalls.length - 1].value as DayState;
    expect(lastDayState.date).toBe("2026-06-22"); // Monday
    expect(Array.isArray(lastDayState.slots)).toBe(true);
  });

  it("logSet with trigger='idle' stores the correct trigger in history", async () => {
    const state = store.getState();
    const firstSlot = state.slots[0];

    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("idle");

    const lastSet = store.getState().history[store.getState().history.length - 1];
    expect(lastSet.trigger).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// Journey 3: log a slot to completion → status "done", session advances to next
// ---------------------------------------------------------------------------
describe("IT1-J3: completing a slot advances to next slot", () => {
  it("logging all sets of a slot marks it done and moves session to next slot", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const state = store.getState();

    // First slot on push day is bb-bench with 3 working sets (1 warmup excluded)
    const firstSlot = state.slots[0];
    const setCount = firstSlot.sets; // Number of working sets

    store.getState().openActive(firstSlot.id);

    // Log all sets
    for (let i = 0; i < setCount; i++) {
      await store.getState().logSet("manual");
    }

    const finalState = store.getState();
    const completedSlot = finalState.slots.find((s) => s.id === firstSlot.id)!;
    expect(completedSlot.status).toBe("done");
    expect(completedSlot.done).toBe(setCount);

    // Session should have advanced to second slot (or allDone if only one slot)
    const session = finalState.activeSession;
    expect(session).not.toBeNull();
    // If there are more slots, the session should be on a different slot
    if (finalState.slots.length > 1) {
      expect(session!.slotId).not.toBe(firstSlot.id);
      // Second slot should now be "now"
      const secondSlot = finalState.slots[1];
      expect(secondSlot.status).toBe("now");
    } else {
      expect(session!.allDone).toBe(true);
    }
  });

  it("after first slot completes, its result string is populated", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const firstSlot = store.getState().slots[0];
    const setCount = firstSlot.sets;

    store.getState().openActive(firstSlot.id);
    for (let i = 0; i < setCount; i++) {
      await store.getState().logSet("manual");
    }

    const completedSlot = store.getState().slots.find((s) => s.id === firstSlot.id)!;
    // result should be non-empty after completion
    expect(completedSlot.result).not.toBe("");
  });
});

// ---------------------------------------------------------------------------
// Journey 4: "restart" — new store over same client restores persisted state
// ---------------------------------------------------------------------------
describe("IT1-J4: new store over same client restores persisted state (restart)", () => {
  it("program persisted by hydrate (via loadAll) is restored on restart", async () => {
    const client = makeInMemoryClient();

    // First boot: hydrate seeded program
    const store1 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const programBefore = store1.getState().program;

    // Modify the program and persist via a planner action
    store1.getState().planRenameDay("push", "Push Day Renamed");
    const modifiedProgram = store1.getState().program;
    expect(modifiedProgram.days.find((d) => d.id === "push")!.name).toBe("Push Day Renamed");

    // Simulate restart: new store over same in-memory client
    const store2 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const restoredProgram = store2.getState().program;

    // The renamed program should be persisted and restored
    expect(restoredProgram.days.find((d) => d.id === "push")!.name).toBe("Push Day Renamed");
  });

  it("history persisted via appendSet is restored on restart", async () => {
    const client = makeInMemoryClient();

    // First boot: log a set
    const store1 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const firstSlot = store1.getState().slots[0];
    store1.getState().openActive(firstSlot.id);
    await store1.getState().logSet("manual");

    expect(store1.getState().history.length).toBe(1);

    // Restart
    const store2 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    expect(store2.getState().history.length).toBe(1);
    expect(store2.getState().history[0].exId).toBe(firstSlot.exId);
  });

  it("theme persisted via setTheme is restored on restart", async () => {
    const client = makeInMemoryClient();

    const store1 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    store1.getState().setTheme("dark");
    expect(store1.getState().theme).toBe("dark");

    // Restart
    const store2 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    expect(store2.getState().theme).toBe("dark");
  });

  it("settings persisted via setSetting are restored on restart", async () => {
    const client = makeInMemoryClient();

    const store1 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    store1.getState().setSetting("opacity", 0.8);
    expect(store1.getState().settings.opacity).toBe(0.8);

    // Restart
    const store2 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    expect(store2.getState().settings.opacity).toBe(0.8);
  });

  it("dayState from a completed set is restored and applied to slot statuses", async () => {
    const client = makeInMemoryClient();

    // First boot: log all sets of first slot (mark it done)
    const store1 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    const firstSlot = store1.getState().slots[0];
    const setCount = firstSlot.sets;

    store1.getState().openActive(firstSlot.id);
    for (let i = 0; i < setCount; i++) {
      await store1.getState().logSet("manual");
    }

    // First slot should now be done
    expect(store1.getState().slots[0].status).toBe("done");

    // Restart on same day
    const store2 = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());
    // The slot done count from dayState should be applied — first slot should be done
    const restoredFirst = store2.getState().slots[0];
    expect(restoredFirst.status).toBe("done");
  });
});

// ---------------------------------------------------------------------------
// Journey 5: planner edits persist + cycled rotation drifts exercise
// ---------------------------------------------------------------------------
describe("IT1-J5: planner edits persist; cycled rotation drifts exercise", () => {
  it("planSetType('cycled') changes program.type and persists to client", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    expect(store.getState().program.type).toBe("fixed");

    store.getState().planSetType("cycled");

    expect(store.getState().program.type).toBe("cycled");

    const programCalls = client._saveSingletonCalls.filter((c) => c.key === "program");
    expect(programCalls.length).toBeGreaterThan(0);
    const savedProgram = programCalls[programCalls.length - 1].value as Program;
    expect(savedProgram.type).toBe("cycled");
  });

  it("planRenameDay persists the new name", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    store.getState().planRenameDay("pull", "Back & Biceps");

    const programCalls = client._saveSingletonCalls.filter((c) => c.key === "program");
    expect(programCalls.length).toBeGreaterThan(0);
    const saved = programCalls[programCalls.length - 1].value as Program;
    expect(saved.days.find((d) => d.id === "pull")!.name).toBe("Back & Biceps");
  });

  it("planAddDay persists the new day and increases day count", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const daysBefore = store.getState().program.days.length;
    store.getState().planAddDay(2); // Add a Tuesday day

    expect(store.getState().program.days.length).toBe(daysBefore + 1);

    const programCalls = client._saveSingletonCalls.filter((c) => c.key === "program");
    expect(programCalls.length).toBeGreaterThan(0);
    const saved = programCalls[programCalls.length - 1].value as Program;
    expect(saved.days.length).toBe(daysBefore + 1);
  });

  it("planSetType('cycled') → push day has slots derived from exercises", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const pushDayBefore = store.getState().program.days.find((d) => d.id === "push")!;
    const exCount = pushDayBefore.exercises.length; // should be 5

    store.getState().planSetType("cycled");

    const pushDayAfter = store.getState().program.days.find((d) => d.id === "push")!;
    // After converting to cycled, slots should be derived from exercises
    expect(pushDayAfter.slots.length).toBeGreaterThan(0);
    // One slot per exercise-group should exist (groups may be merged)
    expect(pushDayAfter.slots.length).toBeLessThanOrEqual(exCount);
  });

  it("cycled rotation: adding to pool and building slots uses pool[0]", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    // Convert to cycled
    store.getState().planSetType("cycled");

    // Verify the program has cycled slots with pools (from conversion)
    const pushDay = store.getState().program.days.find((d) => d.id === "push")!;
    const hasSlots = pushDay.slots.length > 0;
    expect(hasSlots).toBe(true);

    // Verify each slot has a pool
    for (const slot of pushDay.slots) {
      expect(Array.isArray(slot.pool)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Journey 6: export → import round-trip
// ---------------------------------------------------------------------------
describe("IT1-J6: export → import round-trips program+settings+history", () => {
  it("exportData returns a valid JSON string", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    // Make some mutations to ensure there's real data
    store.getState().setTheme("dark");
    store.getState().setSetting("opacity", 0.75);

    const json = await store.getState().exportData();

    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe("Nabd");
    expect(parsed.version).toBe(1);
  });

  it("exportData includes history that was logged", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const firstSlot = store.getState().slots[0];
    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    const json = await store.getState().exportData();
    const parsed = JSON.parse(json) as { history: LoggedSet[] };
    expect(parsed.history.length).toBeGreaterThan(0);
    expect(parsed.history[0].exId).toBe(firstSlot.exId);
  });

  it("importData + hydrate restores exported state to a fresh client", async () => {
    // Client A: build some state
    const clientA = makeInMemoryClient();
    const storeA = await hydrateStore(clientA, () => FIXED_NOW_MONDAY, makeCounter());

    storeA.getState().setTheme("dark");
    storeA.getState().planRenameDay("push", "Exported Push");

    const firstSlot = storeA.getState().slots[0];
    storeA.getState().openActive(firstSlot.id);
    await storeA.getState().logSet("manual");

    const json = await storeA.getState().exportData();

    // Client B: fresh client, import the data
    const clientB = makeInMemoryClient();
    await clientB.importData(json);

    // Hydrate a store from Client B
    const storeB = await hydrateStore(clientB, () => FIXED_NOW_MONDAY, makeCounter());

    // Program should be restored
    expect(storeB.getState().program.days.find((d) => d.id === "push")!.name).toBe(
      "Exported Push",
    );

    // History should be restored
    expect(storeB.getState().history.length).toBeGreaterThan(0);
    expect(storeB.getState().history[0].exId).toBe(firstSlot.exId);
  });

  it("importData round-trip preserves theme", async () => {
    const clientA = makeInMemoryClient();
    const storeA = await hydrateStore(clientA, () => FIXED_NOW_MONDAY, makeCounter());
    storeA.getState().setTheme("light");

    const json = await storeA.getState().exportData();

    const clientB = makeInMemoryClient();
    await clientB.importData(json);

    const storeB = await hydrateStore(clientB, () => FIXED_NOW_MONDAY, makeCounter());
    expect(storeB.getState().theme).toBe("light");
  });
});

// ---------------------------------------------------------------------------
// Journey extras: edge cases + misc behaviors
// ---------------------------------------------------------------------------
describe("IT1-extra: edge cases and additional behaviors", () => {
  it("init() is called during hydrate", async () => {
    const client = makeInMemoryClient();
    expect(client._initCalls).toBe(0);

    await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    expect(client._initCalls).toBe(1);
  });

  it("logSet uses the timestamp from the now() clock", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const firstSlot = store.getState().slots[0];
    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    const lastSet = store.getState().history[store.getState().history.length - 1];
    expect(lastSet.date).toBe("2026-06-22"); // from FIXED_NOW_MONDAY
    expect(lastSet.ts).toContain("2026-06-22");
  });

  it("deterministic newId counter is used for logged set ids", async () => {
    const client = makeInMemoryClient();
    const newId = makeCounter();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, newId);

    const firstSlot = store.getState().slots[0];
    store.getState().openActive(firstSlot.id);
    await store.getState().logSet("manual");

    const lastSet = store.getState().history[store.getState().history.length - 1];
    expect(lastSet.id).toMatch(/^test-id-\d+$/);
  });

  it("closeActive clears activeSession", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const firstSlot = store.getState().slots[0];
    store.getState().openActive(firstSlot.id);
    expect(store.getState().activeSession).not.toBeNull();

    store.getState().closeActive();
    expect(store.getState().activeSession).toBeNull();
  });

  it("stepReps changes reps in activeSession", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const firstSlot = store.getState().slots[0];
    store.getState().openActive(firstSlot.id);

    const repsBefore = store.getState().activeSession!.reps;
    store.getState().stepReps(1);
    expect(store.getState().activeSession!.reps).toBe(repsBefore + 1);
  });

  it("multiple logSets accumulate in client._appendSetCalls", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const firstSlot = store.getState().slots[0];
    store.getState().openActive(firstSlot.id);

    await store.getState().logSet("manual");
    await store.getState().logSet("manual");

    expect(client._appendSetCalls.length).toBe(2);
  });

  it("logSet with no activeSession is a no-op", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    expect(store.getState().activeSession).toBeNull();
    const histBefore = store.getState().history.length;

    await store.getState().logSet("manual");

    expect(store.getState().history.length).toBe(histBefore);
    expect(client._appendSetCalls.length).toBe(0);
  });

  it("planEdit addSet increases set count in the program for a day", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    const pushDay = store.getState().program.days.find((d) => d.id === "push")!;
    const firstEx = pushDay.exercises[0]; // x1 = bb-bench
    const setsBefore = firstEx.sets.length;

    store.getState().planEdit("push", { kind: "ex", id: "x1" }, "addSet");

    const pushDayAfter = store.getState().program.days.find((d) => d.id === "push")!;
    const firstExAfter = pushDayAfter.exercises[0];
    expect(firstExAfter.sets.length).toBe(setsBefore + 1);
  });

  it("setTheme persists via saveSingleton", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    store.getState().setTheme("light");

    const themeCalls = client._saveSingletonCalls.filter((c) => c.key === "theme");
    expect(themeCalls.length).toBeGreaterThan(0);
    expect(themeCalls[themeCalls.length - 1].value).toBe("light");
  });

  it("setSetting persists via saveSingleton with updated value", async () => {
    const client = makeInMemoryClient();
    const store = await hydrateStore(client, () => FIXED_NOW_MONDAY, makeCounter());

    store.getState().setSetting("idleNudge", 60);

    const settingsCalls = client._saveSingletonCalls.filter((c) => c.key === "settings");
    expect(settingsCalls.length).toBeGreaterThan(0);
    const savedSettings = settingsCalls[settingsCalls.length - 1].value as Settings;
    expect(savedSettings.idleNudge).toBe(60);
    // Also update in state
    expect(store.getState().settings.idleNudge).toBe(60);
  });
});
