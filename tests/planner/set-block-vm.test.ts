import type { Prescription } from "@nabd/domain";
import { CATALOG } from "../support/exercises";
import { officeStrength } from "../support/programs";
import { blockOf, dayOf } from "./fixtures";

/** The set table of a one-exercise day with this prescription. */
function blockFor(prescription: Prescription) {
  const program = officeStrength();
  dayOf(program, "d-push").exercises = [{ id: "e-only", exId: CATALOG.bench, ...prescription }];
  return blockOf(program, "d-push", "e-only");
}

describe("set table view-model", () => {
  it("numbers working sets and letters warm-ups and drop sets", () => {
    const block = blockOf(officeStrength(), "d-push", "e-bench");

    expect(block.rows.map((r) => r.badge)).toEqual(["W", "1", "2", "D"]);
    expect(block.rows.map((r) => r.type)).toEqual(["warmup", "working", "working", "drop"]);
    expect(block.rows.map((r) => r.badgeTitle)).toEqual([
      "Warm-up — click to change",
      "Working set — click to change",
      "Working set — click to change",
      "Drop set — click to change",
    ]);
    expect(block.rows.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it("shows a rep range with an RPE column", () => {
    const block = blockOf(officeStrength(), "d-push", "e-bench");

    expect(block.repHeader).toBe("Reps");
    expect(block.intensityHeader).toBe("RPE");
    expect(block.rows.map((r) => [r.amount, r.upTo])).toEqual([
      ["10", "12"],
      ["8", "10"],
      ["6", "8"],
      ["12", "15"],
    ]);
    expect(block.rows.map((r) => r.intensity)).toEqual(["6", "8", "8.5", "9"]);
    expect(block.notes).toBe("Pause on the chest");
  });

  it("shows fixed reps with a %1RM column", () => {
    const block = blockOf(officeStrength(), "d-push", "e-ohp");

    expect(block.intensityHeader).toBe("%1RM");
    expect(block.rows.map((r) => [r.amount, r.upTo])).toEqual(Array(3).fill(["5", null]));
    expect(block.rows.map((r) => r.intensity)).toEqual(["70%", "72.5%", "75%"]);
    expect(block.notes).toBe("");
  });

  it("shows seconds and no load column for a timed hold", () => {
    const block = blockOf(officeStrength(), "d-push", "e-plank");

    expect(block.repHeader).toBe("Time");
    expect(block.intensityHeader).toBeNull();
    expect(block.rows.map((r) => [r.amount, r.upTo, r.intensity])).toEqual([
      ["45s", null, null],
      ["60s", null, null],
    ]);
  });

  it("names each row's controls by the set's place in the table", () => {
    const [warmup, first] = blockOf(officeStrength(), "d-push", "e-bench").rows;

    expect(warmup!.labels).toEqual({
      amount: "Set 1 reps",
      upTo: "Set 1 top of range",
      intensity: "Set 1 RPE",
      remove: "Remove set 1",
    });
    expect(first!.labels.amount).toBe("Set 2 reps");
    expect(blockOf(officeStrength(), "d-push", "e-plank").rows[0]!.labels.amount).toBe(
      "Set 1 seconds",
    );
  });

  it("ignores a leftover range top when reps are fixed, and a leftover value when load is off", () => {
    const block = blockFor({
      repMode: "fixed",
      intensity: "none",
      rest: 60,
      sets: [{ type: "working", amount: 12, upTo: 15, intensity: 8 }],
    });

    expect(block.rows[0]).toMatchObject({ amount: "12", upTo: null, intensity: null });
  });

  it.each([
    [150, "2:30"],
    [45, "0:45"],
    [65, "1:05"],
    [0, "0:00"],
  ])("formats %i s of rest as %s", (rest, expected) => {
    expect(blockFor({ repMode: "fixed", intensity: "none", rest, sets: [] }).rest).toBe(expected);
  });
});
