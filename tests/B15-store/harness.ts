// The store under test conditions: an in-memory backend that behaves like the
// real one, a clock the test controls, and a small floating plan to train on.

import type { LoggedSet, Program } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { createMemoryBackend } from "@nabd/ipc-client";
import type { BootSnapshot, MemoryBackend } from "@nabd/ipc-client";
import { createNabdStore, selectTodayPlan } from "@nabd/store";
import { logged, nov, row, threeSets } from "../support/domain-factories";

export const BENCH = "bench_press__barbell";
export const FLY = "fly__dumbbell";
export const ROW = "row__barbell";
export const benchRow = row(BENCH, threeSets());
export const flyRow = row(FLY, threeSets());

/** Floating two-day plan: Push (bench, fly) then Pull (row). */
export const program: Program = {
  name: "Test plan",
  type: "fixed",
  schedule: "floating",
  days: [
    { id: "push", name: "Push", weekday: null, exercises: [benchRow, flyRow], slots: [] },
    { id: "pull", name: "Pull", weekday: null, exercises: [row(ROW, threeSets())], slots: [] },
  ],
};

/** A stored bench set of 8 × 40 kg, as an earlier run of the app would have left it. */
export const benchSet = (at: Date, overrides: Partial<LoggedSet> = {}): LoggedSet =>
  logged(ExerciseLibrary.catalog.byId(BENCH)!, at, 8, 40, overrides);

/** The client calls the tests assert on or make fail. */
const SPIED = [
  "save",
  "saveMany",
  "appendSet",
  "deleteSet",
  "exportData",
  "importData",
  "sendTestNotification",
  "setGlass",
  "setAutostart",
  "quit",
] as const;

/** An in-memory backend on a computer that supports everything, with spies on its calls. */
export function fakeBackend(initial: Partial<BootSnapshot> = {}): MemoryBackend {
  const backend = createMemoryBackend(initial, { tray: true, glass: true, idle: true });
  for (const call of SPIED) vi.spyOn(backend.client, call);
  return backend;
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
