import { describeNextSet } from "@nabd/session";
import type { NextSetWording } from "@nabd/session";
import { did, lastWeek, pushDay } from "../support/programs";
import { buildWorld } from "../support/world";
import type { WorldInput } from "../support/world";

function nextSetOf(itemId: string, input: Partial<WorldInput> = {}): NextSetWording {
  const { plan, coach } = buildWorld({ program: pushDay(), history: lastWeek(), ...input });
  const item = plan.item(itemId);
  if (!item) throw new Error(`no plan item ${itemId}`);
  return describeNextSet(item, coach, "kg");
}

describe("describeNextSet", () => {
  it("words a warm-up's target and the plan's note, with no advice", () => {
    expect(nextSetOf("p-bench")).toEqual({
      exercise: "Bench Press",
      position: "Set 1 of 3",
      target: "Warm-up · 10 reps",
      muscleNames: ["Chest", "Triceps", "Front Delts"],
      notes: "Pause at the chest",
      advice: null,
    });
  });

  it("advises a working set against last session", () => {
    const next = nextSetOf("p-row");
    expect(next.target).toBe("Working set · 8–12 reps");
    expect(next.notes).toBe("");
    expect(next.advice?.basis).toBe("Last time: 12 × 50 kg");
  });

  it("has no target for an extra, which the plan does not prescribe", () => {
    const next = nextSetOf("x-curl", { extras: [{ id: "x-curl", exId: "curl" }] });
    expect(next.target).toBeNull();
  });

  it("has no target once every prescribed set is logged", () => {
    const history = [...lastWeek(), did("p-plank", "plank", 30, null)];
    expect(nextSetOf("p-plank", { history }).target).toBeNull();
  });
});
