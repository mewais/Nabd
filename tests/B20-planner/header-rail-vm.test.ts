import { EMPTY_PROGRAM } from "@nabd/domain";
import type { Program } from "@nabd/domain";
import { cycledProgram, fixedProgram, floating, vmOf } from "./fixtures";

/** A floating plan with this many (empty) days. */
const floatingPlanOf = (days: number): Program => ({
  ...EMPTY_PROGRAM,
  schedule: "floating",
  days: [...Array(days).keys()].map((i) => ({
    id: `d-${i}`,
    name: `Day ${i + 1}`,
    weekday: null,
    exercises: [],
    slots: [],
  })),
});

describe("header view-model", () => {
  it("carries the program's name, type and schedule", () => {
    expect(vmOf(cycledProgram()).header).toMatchObject({
      name: "Rotation",
      type: "cycled",
      schedule: "weekday",
    });
  });

  it("offers both schedules while the plan fits in a week", () => {
    expect(vmOf(floatingPlanOf(7)).header.scheduleOptions).toEqual([
      { k: "weekday", label: "Weekdays", disabled: false },
      { k: "floating", label: "Floating", disabled: false },
    ]);
  });

  it("does not offer weekdays to a floating plan longer than a week, and says why", () => {
    const [weekdays, floatingOption] = vmOf(floatingPlanOf(8)).header.scheduleOptions;

    expect(weekdays).toEqual({
      k: "weekday",
      label: "Weekdays",
      disabled: true,
      title: "A week has room for 7 days; this plan has 8",
    });
    expect(floatingOption!.disabled).toBe(false);
  });
});

describe("coverage rail view-model", () => {
  it("lists the muscles the plan trains, most sets first, against full weekly coverage", () => {
    const { bars, coverage } = vmOf(fixedProgram()).rail;

    // Bench 3 working sets + OHP 3: front delts are secondary to one, primary to the other.
    const chest = bars.find((bar) => bar.muscle === "chest");
    expect(chest).toEqual({ muscle: "chest", name: "Chest", pct: coverage.chest, value: "3 sets" });
    expect(coverage.chest).toBeCloseTo((3 / 16) * 100);
    expect(bars.map((bar) => bar.pct)).toEqual(
      [...bars.map((bar) => bar.pct)].sort((a, b) => b - a),
    );
    expect(bars.every((bar) => bar.pct > 0)).toBe(true);
  });

  it("writes fractional and single sets naturally", () => {
    const values = vmOf(floating(cycledProgram())).rail.bars.map((bar) => bar.value);

    expect(values).toContain("1 set");
    expect(values.some((value) => /^\d+\.\d+ sets$/.test(value))).toBe(true);
  });

  it("has nothing to list for an empty plan", () => {
    expect(vmOf(EMPTY_PROGRAM).rail.bars).toEqual([]);
  });
});
