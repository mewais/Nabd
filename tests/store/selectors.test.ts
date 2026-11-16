import { selectCoverage, selectLibrary, selectStats, selectTodayPlan } from "@nabd/store";
import { BENCH, benchRow, boot } from "./harness";

describe("derived data", () => {
  it("coverage, stats and the library follow the state", async () => {
    const app = await boot();
    expect(selectCoverage(app.get()).chest).toBe(0);
    await app.log(benchRow.id, 2);
    expect(selectCoverage(app.get()).chest).toBe(12.5);
    expect(selectStats(app.get()).setsThisWeek()).toBe(2);
    expect(selectStats(app.get()).completionThisWeek()).toBe(33);
    expect(selectLibrary(app.get()).byId(BENCH)?.name).toBe("Barbell Bench Press");
  });

  it("selectors return the same object until their inputs change", async () => {
    const app = await boot();
    const before = selectTodayPlan(app.get());
    app.get().setScreen("progress");
    app.get().setMapView("front");
    app.get().setMapStyle("outline");
    app.get().setProgressTab("weekly");
    app.get().setChartExercise(BENCH);
    app.get().selectPlanDay("pull");
    expect(selectTodayPlan(app.get())).toBe(before);
    expect(app.get()).toMatchObject({
      screen: "progress",
      planEditDay: "pull",
      chartExercise: BENCH,
    });
    await app.log(benchRow.id, 1);
    expect(selectTodayPlan(app.get())).not.toBe(before);
  });
});
