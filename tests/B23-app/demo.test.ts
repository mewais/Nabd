import { ExerciseLibrary } from "@nabd/dataset";
import { createNabdStore, selectStats, selectTodayPlan } from "@nabd/store";
import { createDemoClient } from "../../packages/B23-app/src/demo";
import { DEMO_PROGRAM } from "../../packages/B23-app/src/demo-data";

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
