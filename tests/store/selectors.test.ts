import { selectCoverage, selectLibrary, selectStats, selectTodayPlan } from "@nabd/store";
import { CATALOG } from "../support/exercises";
import { nov } from "../support/builders";
import { catalogBenchRow, catalogPushPull } from "../support/programs";
import { benchSet, boot } from "./fixtures";

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

  it("stats agree with Today on what is planned, before the first set of a floating day", async () => {
    const app = await boot();
    expect(app.plan().setsPlanned).toBe(6);
    const today = selectStats(app.get()).completionByDay().at(-1);
    expect(today?.pct).toBe(0);
    expect(selectStats(app.get()).completionThisWeek()).toBe(0);
  });

  it("the streak counts the workdays of the settings", async () => {
    const app = await boot({ program: catalogPushPull, history: [benchSet(nov(13, 10))] });
    await app.log(catalogBenchRow.id, 1);
    // Friday and Monday trained: the weekend off neither adds to the streak nor breaks it.
    expect(selectStats(app.get()).streak()).toBe(2);
    // Worked every day, the idle Sunday breaks it.
    app.get().updateSettings({ workDays: [0, 1, 2, 3, 4, 5, 6] });
    expect(selectStats(app.get()).streak()).toBe(1);
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
