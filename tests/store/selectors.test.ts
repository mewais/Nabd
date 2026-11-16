import { selectCoverage, selectLibrary, selectStats, selectTodayPlan } from "@nabd/store";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow } from "../support/programs";
import { boot } from "./fixtures";

describe("derived data", () => {
  it("coverage, stats and the library follow the state", async () => {
    const app = await boot();
    expect(selectCoverage(app.get()).chest).toBe(0);
    await app.log(catalogBenchRow.id, 2);
    expect(selectCoverage(app.get()).chest).toBe(12.5);
    expect(selectStats(app.get()).setsThisWeek()).toBe(2);
    expect(selectStats(app.get()).completionThisWeek()).toBe(33);
    expect(selectLibrary(app.get()).byId(CATALOG.bench)?.name).toBe("Barbell Bench Press");
  });

  it("selectors return the same object until their inputs change", async () => {
    const app = await boot();
    const before = selectTodayPlan(app.get());
    app.get().showScreen("progress");
    app.get().setMapView("front");
    app.get().setMapStyle("outline");
    app.get().setProgressTab("weekly");
    app.get().openChart(CATALOG.bench);
    app.get().selectPlannerDay("pull");
    expect(selectTodayPlan(app.get())).toBe(before);
    expect(app.get()).toMatchObject({
      screen: "progress",
      plannerDayId: "pull",
      chartExercise: CATALOG.bench,
    });
    await app.log(catalogBenchRow.id, 1);
    expect(selectTodayPlan(app.get())).not.toBe(before);
  });
});
