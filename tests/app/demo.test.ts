import { ExerciseLibrary } from "@nabd/dataset";
import { createNabdStore, selectStats, selectTodayPlan } from "@nabd/store";
import { createDemoClient } from "@nabd/app/demo";
import { DEMO_PROGRAM } from "@nabd/app/demo-data";

describe("the browser demo", () => {
  it("plans only exercises the catalog has", () => {
    for (const day of DEMO_PROGRAM.days) {
      for (const row of day.exercises) {
        expect(ExerciseLibrary.catalog.byId(row.exId), row.exId).toBeDefined();
      }
    }
  });

  it("boots the store on a plan with work today and two weeks of history behind it", async () => {
    const store = createNabdStore({
      client: createDemoClient(),
      now: () => new Date(),
      newId: () => crypto.randomUUID(),
    });
    await store.getState().hydrate();

    const state = store.getState();
    expect(state.loadProblems).toEqual([]);
    expect(selectTodayPlan(state).setsRemaining).toBeGreaterThan(0);
    expect(state.history.length).toBeGreaterThan(0);
    expect(selectStats(state).activeDays()).toBe(7);
  });

  it("starts from the data an end-to-end test supplies instead of the sample plan", async () => {
    window.__NABD_E2E_SNAPSHOT__ = { settings: { weightUnit: "lb" } };
    try {
      const snapshot = await createDemoClient().loadAll();
      expect(snapshot.settings).toEqual({ weightUnit: "lb" });
      expect(snapshot.program).toBeNull();
      expect(snapshot.history).toEqual([]);
    } finally {
      delete window.__NABD_E2E_SNAPSHOT__;
    }
  });

  it("ticks once a second until told to stop", async () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const stop = await createDemoClient().onTick(onTick);
    vi.advanceTimersByTime(3000);
    stop();
    vi.advanceTimersByTime(3000);
    expect(onTick).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
