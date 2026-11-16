/**
 * @nabd/modals — buildToastVM: what the nudge toast says, and when
 * there is one at all.
 */

import { buildToastVM } from "@nabd/modals";
import { buildWorld, did, pushDay } from "../support/plan-fixtures";
import { nov } from "../support/domain-factories";

describe("buildToastVM", () => {
  /** Bench Press with its warm-up done: the next set is 2 of 3. */
  const next = buildWorld({
    program: pushDay(),
    history: [did("p-bench", "bench", 10, 40, { setType: "warmup" })],
  }).plan.nextItem;

  it("names the set that is due and where it sits in the plan", () => {
    expect(buildToastVM(next, { state: "due", reason: "timer" })).toEqual({
      title: "Time to move",
      reason: "Interval's up",
      exercise: "Bench Press",
      detail: "Chest · set 2 of 3",
    });
  });

  it("says when the nudge came from an idle moment", () => {
    expect(buildToastVM(next, { state: "due", reason: "idle" })?.reason).toBe("You've gone quiet");
  });

  it("is null while no set is due", () => {
    expect(buildToastVM(next, { state: "off_hours", at: nov(17, 9, 0) })).toBeNull();
    expect(buildToastVM(next, { state: "paused" })).toBeNull();
  });

  it("is null when nothing is left to do", () => {
    expect(buildToastVM(null, { state: "due", reason: "timer" })).toBeNull();
  });
});
