/** @nabd/today — buildTodayVM, the week's coverage and what stands out in it. */

import { EMPTY_PROGRAM, MUSCLES } from "@nabd/domain";
import { mondayProgram, pushDay } from "../support/programs";
import { benchWeek, todayVM } from "./fixtures";

describe("buildTodayVM · coverage and insight", () => {
  it("carries the map's view and style through", () => {
    const vm = todayVM({ program: pushDay() }, { mapView: "back", mapStyle: "outline" });
    expect(vm.coverage).toMatchObject({ view: "back", mapStyle: "outline" });
  });

  it("lists every muscle down the body with its coverage and what it is due", () => {
    const { legend } = todayVM({ program: pushDay(), history: benchWeek() }).coverage;
    expect(legend).toHaveLength(MUSCLES.length);
    expect(legend[0]).toEqual({ muscle: "front_delts", pct: 37.5, recommendation: "push" });
    expect(legend.find((row) => row.muscle === "chest")).toMatchObject({
      pct: 75,
      recommendation: "rest",
    });
    expect(legend.at(-1)?.muscle).toBe("neck");
  });

  it("tags a muscle to push only if the plan trains it, like the insight beside the list", () => {
    const { coverage, insight } = todayVM({ program: pushDay(), history: benchWeek() });
    const due = (muscle: string) =>
      coverage.legend.find((row) => row.muscle === muscle)?.recommendation;
    // Rows train the lats; nothing in the plan trains calves or the neck.
    expect([due("lats"), due("calves"), due("neck")]).toEqual(["push", "none", "none"]);
    const pushed = coverage.legend.filter((row) => row.recommendation === "push");
    expect(pushed.length).toBeGreaterThanOrEqual(insight[1]!.text.split(",").length);

    // With no plan there is nothing to push, in the list as in the insight.
    const noPlan = todayVM({ program: mondayProgram([]) });
    expect(noPlan.coverage.legend.every((row) => row.recommendation === "none")).toBe(true);
    expect(noPlan.insight).toEqual([]);
  });

  it("says which muscles to rest, and which of the muscles the plan trains to push", () => {
    const { insight } = todayVM({ program: pushDay(), history: benchWeek() });
    expect(insight).toEqual([
      { kind: "rest", lead: "Rest these", text: " — Chest are well-trained this week." },
      {
        kind: "push",
        lead: "Push these",
        text: " — Rhomboids, Lats, Abs are lagging. Good to prioritize.",
      },
    ]);
  });

  it("has nothing to say without a plan or a history", () => {
    expect(todayVM({ program: EMPTY_PROGRAM }).insight).toEqual([]);
  });
});
