// The store under test conditions: an in-memory backend that behaves like the
// real one, a clock the test controls, and a small floating plan to train on.

import type { LoggedSet, Program } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import type { BootSnapshot, IpcClient, Singletons } from "@nabd/ipc-client";
import { createNabdStore, selectTodayPlan } from "@nabd/store";
import { logged, nov, row, threeSets } from "../support/domain-factories";

export const BENCH = "bench_press__barbell";
export const FLY = "fly__dumbbell";
export const ROW = "row__barbell";
export const benchRow = row(BENCH, threeSets);
export const flyRow = row(FLY, threeSets);

/** Floating two-day plan: Push (bench, fly) then Pull (row). */
export const program: Program = {
  name: "Test plan",
  type: "fixed",
  schedule: "floating",
  days: [
    { id: "push", name: "Push", weekday: null, exercises: [benchRow, flyRow], slots: [] },
    { id: "pull", name: "Pull", weekday: null, exercises: [row(ROW, threeSets)], slots: [] },
  ],
};

/** A stored bench set of 8 × 40 kg, as an earlier run of the app would have left it. */
export const benchSet = (at: Date, overrides: Partial<LoggedSet> = {}): LoggedSet =>
  logged(ExerciseLibrary.catalog.byId(BENCH)!, at, 8, 40, overrides);

/** An in-memory backend that behaves like the real one, plus spies on the native calls. */
export function fakeBackend(initial: Partial<BootSnapshot> = {}) {
  const data: BootSnapshot = {
    program: null,
    settings: null,
    customExercises: null,
    rotationState: null,
    dayState: null,
    dayLog: null,
    history: [],
    ...initial,
  };
  const client: IpcClient = {
    loadAll: async () => structuredClone(data),
    save: vi.fn(async (key: keyof Singletons, value: unknown) => {
      data[key] = structuredClone(value);
    }),
    saveMany: vi.fn(async (values: Partial<Singletons>) => {
      Object.assign(data, structuredClone(values));
    }),
    appendSet: vi.fn(async (set) => {
      data.history.push(set);
    }),
    deleteSet: vi.fn(async (id) => {
      data.history = data.history.filter((s) => (s as LoggedSet).id !== id);
    }),
    exportData: vi.fn(async () => "/downloads/nabd-data.json"),
    importData: vi.fn(async (imported) => {
      Object.assign(data, imported);
    }),
    notify: vi.fn(async () => {}),
    platformCapabilities: async () => ({ tray: true, glass: true, idle: true }),
    sendTestNotification: vi.fn(async () => {}),
    setGlass: vi.fn(async () => {}),
    setAutostart: vi.fn(async () => {}),
    updateTray: vi.fn(async () => {}),
    quit: vi.fn(async () => {}),
    onTick: async () => () => {},
    onTrayAction: async () => () => {},
  };
  return { client, data };
}

/** A booted store on Monday 16 Nov 2026 (10:00 unless told otherwise), with a clock the test controls. */
export async function boot(
  initial: Partial<BootSnapshot> = { program },
  backend = fakeBackend(initial),
  startAt = nov(16, 10),
) {
  const clock = { now: startAt };
  let id = 0;
  const store = createNabdStore({
    client: backend.client,
    now: () => clock.now,
    newId: () => `id${++id}`,
  });
  await store.getState().hydrate();
  const get = store.getState;
  return {
    ...backend,
    store,
    get,
    clock,
    plan: () => selectTodayPlan(get()),
    /** Move the clock and let the app notice. */
    advanceTo: (date: Date, idleSeconds = 0) => {
      clock.now = date;
      get().tick(idleSeconds);
    },
    /** The keys written to the backend, in order. */
    savedKeys: () => vi.mocked(backend.client.save).mock.calls.map(([key]) => key),
    /** Open the logger on an item and log `count` sets as they stand. */
    log: async (itemId: string, count: number) => {
      get().openSession(itemId);
      for (let i = 0; i < count; i++) await get().logSet();
    },
  };
}
