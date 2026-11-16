/**
 * @nabd/modals — buildChartVM: what the full-history chart says about
 * a real exercise trend.
 */

import { did } from "../support/programs";
import { dateKey } from "@nabd/domain";
import { buildChartVM } from "@nabd/modals";
import { nov } from "../support/builders";
import { benchHistory, trendOf } from "./fixtures";

describe("buildChartVM", () => {
  const values = (vm: ReturnType<typeof buildChartVM>) => vm.stats.map((stat) => stat.value);

  it("summarises the trend: since when, how many sessions, best, current and gain", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"), "kg");

    expect(vm.exercise).toBe("Bench Press");
    expect(vm.subtitle).toBe(`Since ${dateKey(nov(2))} · 3 sessions`);
    expect(vm.stats).toEqual([
      { label: "Personal best", value: "79.2 kg e1RM", tone: "accent" },
      { label: "Current", value: "79.2 kg e1RM", tone: "neutral" },
      { label: "All-time gain", value: "+3.2 kg e1RM", tone: "success" },
    ]);
  });

  it("charts the best set of each session, oldest first, between the first date and now", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"), "kg");

    expect(vm.series).toEqual([76, 78, 79.17]);
    expect(vm.chartLabel).toBe("Bench Press, kg e1RM per session");
    expect(vm.startLabel).toBe(dateKey(nov(2)));
    expect(vm.endLabel).toBe("Now");
  });

  it("measures an unloaded exercise in reps and shows a loss as negative", () => {
    const history = [
      did(null, "pushup", 15, null, { at: nov(2) }),
      did(null, "pushup", 18, null, { at: nov(9) }),
      did(null, "pushup", 14, null, { at: nov(16) }),
    ];
    const vm = buildChartVM("Push-Up", trendOf(history, "pushup"), "kg");

    expect(values(vm)).toEqual(["18 reps", "14 reps", "-1 reps"]);
  });

  it("measures a timed hold in seconds", () => {
    const history = [
      did(null, "plank", 30, null, { at: nov(9) }),
      did(null, "plank", 45, null, { at: nov(16) }),
    ];
    const vm = buildChartVM("Plank", trendOf(history, "plank"), "kg");

    expect(values(vm)).toEqual(["45 s", "45 s", "+15 s"]);
  });

  it("reports loaded trends in pounds for lb users", () => {
    const vm = buildChartVM("Bench Press", trendOf(benchHistory(), "bench"), "lb");
    expect(values(vm)).toEqual(["174.5 lb e1RM", "174.5 lb e1RM", "+7 lb e1RM"]);
  });

  it("counts a single session as one, with no gain", () => {
    const vm = buildChartVM(
      "Bench Press",
      trendOf([did(null, "bench", 8, 60, { at: nov(16) })], "bench"),
      "kg",
    );

    expect(vm.subtitle).toBe(`Since ${dateKey(nov(16))} · 1 session`);
    expect(vm.series).toEqual([76]);
    expect(values(vm)[2]).toBe("0 kg e1RM");
  });
});
