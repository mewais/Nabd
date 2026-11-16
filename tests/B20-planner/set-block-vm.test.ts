import type { Prescription } from "@nabd/domain";
import { FIXTURE_EXERCISE_IDS, blockOf, dayOf, fixedProgram, lookup } from "./fixtures";

/** The set table of a one-exercise day with this prescription. */
function blockFor(prescription: Prescription) {
  const program = fixedProgram();
  dayOf(program, "d-push").exercises = [
    { id: "e-only", exId: FIXTURE_EXERCISE_IDS[0]!, ...prescription },
  ];
  return blockOf(program, "d-push", "e-only");
}

describe("fixtures", () => {
  it("only reference exercises that exist in the catalog", () => {
    for (const id of FIXTURE_EXERCISE_IDS) expect(lookup(id), id).toBeDefined();
  });
});

describe("set table view-model", () => {
  it("numbers working sets and letters warm-ups and drop sets", () => {
    const block = blockOf(fixedProgram(), "d-push", "e-bench");

    expect(block.rows.map((r) => r.badgeLabel)).toEqual(["W", "1", "2", "D"]);
    expect(block.rows.map((r) => r.badgeKind)).toEqual(["warm", "work", "work", "drop"]);
    expect(block.rows.map((r) => r.badgeTitle)).toEqual([
      "Warm-up — click to change",
      "Working — click to change",
      "Working — click to change",
      "Drop set — click to change",
    ]);
    expect(block.rows.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it("shows a rep range with an RPE column", () => {
    const block = blockOf(fixedProgram(), "d-push", "e-bench");

    expect(block.repHeader).toBe("Reps");
    expect(block.intensityHeader).toBe("RPE");
    expect(block.rows.map((r) => [r.low, r.high])).toEqual([
      ["10", "12"],
      ["8", "10"],
      ["6", "8"],
      ["12", "15"],
    ]);
    expect(block.rows.map((r) => r.intensity)).toEqual(["6", "8", "8.5", "9"]);
    expect(block.notes).toBe("Pause on the chest");
  });

  it("shows fixed reps with a %1RM column", () => {
    const block = blockOf(fixedProgram(), "d-push", "e-ohp");

    expect(block.intensityHeader).toBe("%1RM");
    expect(block.rows.map((r) => [r.low, r.high])).toEqual(Array(3).fill(["5", null]));
    expect(block.rows.map((r) => r.intensity)).toEqual(["70%", "72.5%", "75%"]);
    expect(block.notes).toBe("");
  });

  it("shows seconds and no load column for a timed hold", () => {
    const block = blockOf(fixedProgram(), "d-push", "e-plank");

    expect(block.repHeader).toBe("Time");
    expect(block.intensityHeader).toBeNull();
    expect(block.rows.map((r) => [r.low, r.high, r.intensity])).toEqual([
      ["45s", null, null],
      ["60s", null, null],
    ]);
  });

  it("names each row's controls by the set's place in the table", () => {
    const [warmup, first] = blockOf(fixedProgram(), "d-push", "e-bench").rows;

    expect(warmup!.labels).toEqual({
      low: "Set 1 reps",
      high: "Set 1 top of range",
      intensity: "Set 1 RPE",
      remove: "Remove set 1",
    });
    expect(first!.labels.low).toBe("Set 2 reps");
    expect(blockOf(fixedProgram(), "d-push", "e-plank").rows[0]!.labels.low).toBe("Set 1 seconds");
  });

  it("ignores a leftover range top when reps are fixed, and a leftover value when load is off", () => {
    const block = blockFor({
      repMode: "fixed",
      intensity: "none",
      rest: 60,
      sets: [{ type: "working", a: 12, b: 15, val: 8 }],
    });

    expect(block.rows[0]).toMatchObject({ low: "12", high: null, intensity: null });
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
