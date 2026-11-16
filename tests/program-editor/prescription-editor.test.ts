import type { EditRef, ProgramEdit } from "@nabd/program-editor";
import { plank, apply, oneDay, DAY, withBench, BENCH, sets } from "./fixtures";

describe("ProgramEditor — prescriptions", () => {
  it("adds sets and warm-ups, and never removes the last set", () => {
    const more = apply(
      withBench,
      (e) => e.editPrescription(DAY, BENCH, (p) => p.addSet()),
      (e) => e.editPrescription(DAY, BENCH, (p) => p.addWarmup()),
    );
    expect(sets(more).map((s) => s.type)).toEqual([
      "warmup",
      "working",
      "working",
      "working",
      "working",
    ]);
    const one = apply(
      withBench,
      (e) => e.editPrescription(DAY, BENCH, (p) => p.removeSet(0)),
      (e) => e.editPrescription(DAY, BENCH, (p) => p.removeSet(0)),
    );
    expect(sets(one)).toHaveLength(1);
    expect(
      sets(apply(one, (e) => e.editPrescription(DAY, BENCH, (p) => p.removeSet(0)))),
    ).toHaveLength(1);
  });

  it("cycles a set's type working → warm-up → drop → working", () => {
    const cycle: ProgramEdit = (e) => e.editPrescription(DAY, BENCH, (p) => p.cycleSetType(0));
    expect(sets(apply(withBench, cycle))[0]!.type).toBe("warmup");
    expect(sets(apply(withBench, cycle, cycle))[0]!.type).toBe("drop");
    expect(sets(apply(withBench, cycle, cycle, cycle))[0]!.type).toBe("working");
  });

  it("steps reps while keeping the range ordered and at least one rep", () => {
    const up = apply(
      withBench,
      ...Array<ProgramEdit>(6).fill((e) =>
        e.editPrescription(DAY, BENCH, (p) => p.stepAmount(0, 1)),
      ),
    );
    expect(sets(up)[0]).toMatchObject({ amount: 14, upTo: 14 });
    const down = apply(
      withBench,
      ...Array<ProgramEdit>(9).fill((e) =>
        e.editPrescription(DAY, BENCH, (p) => p.stepUpTo(0, -1)),
      ),
    );
    expect(sets(down)[0]).toMatchObject({ amount: 8, upTo: 8 });
    const floor = apply(
      withBench,
      ...Array<ProgramEdit>(20).fill((e) =>
        e.editPrescription(DAY, BENCH, (p) => p.stepAmount(0, -1)),
      ),
    );
    expect(sets(floor)[0]!.amount).toBe(1);
  });

  it("switching between a range and fixed reps adds or drops the top of the range", () => {
    const fixed = apply(withBench, (e) =>
      e.editPrescription(DAY, BENCH, (p) => p.setRepStyle("fixed")),
    );
    expect(sets(fixed)[0]).toEqual({ type: "working", amount: 8 });
    expect(
      sets(apply(fixed, (e) => e.editPrescription(DAY, BENCH, (p) => p.setRepStyle("range"))))[0],
    ).toMatchObject({
      amount: 8,
      upTo: 10,
    });
    const unchanged = apply(withBench, (e) =>
      e.editPrescription(DAY, BENCH, (p) => p.setRepStyle("range")),
    );
    expect(sets(unchanged)[0]).toEqual({ type: "working", amount: 8, upTo: 12 });
  });

  it("a timed exercise is prescribed in seconds, whatever rep style is asked for", () => {
    const timed = apply(oneDay, (e) => e.addExercise(DAY, plank.id));
    const PLANK: EditRef = { kind: "exercise", id: timed.days[0]!.exercises[0]!.id };
    expect(
      sets(apply(timed, (e) => e.editPrescription(DAY, PLANK, (p) => p.stepAmount(0, 1))))[0]!
        .amount,
    ).toBe(50);
    for (const style of ["range", "fixed"] as const) {
      const asked = apply(timed, (e) =>
        e.editPrescription(DAY, PLANK, (p) => p.setRepStyle(style)),
      );
      expect(asked.days[0]!.exercises[0]!.repMode).toBe("time");
      expect(sets(asked)[0]).toEqual({ type: "working", amount: 45 });
    }
  });

  it("switching the load mode starts every set from the new scale's usual value", () => {
    const rpe = apply(
      withBench,
      (e) => e.editPrescription(DAY, BENCH, (p) => p.setIntensity("rpe")),
      (e) => e.editPrescription(DAY, BENCH, (p) => p.stepIntensity(0, 1)),
      (e) => e.editPrescription(DAY, BENCH, (p) => p.stepIntensity(0, 1)),
    );
    expect(sets(rpe).map((s) => s.intensity)).toEqual([9, 8, 8]);
    // An RPE of 9 must not come back as 9% of a one-rep max.
    const pct = apply(rpe, (e) => e.editPrescription(DAY, BENCH, (p) => p.setIntensity("pct")));
    expect(sets(pct).map((s) => s.intensity)).toEqual([70, 70, 70]);
    expect(
      sets(apply(pct, (e) => e.editPrescription(DAY, BENCH, (p) => p.setIntensity("rpe")))).map(
        (s) => s.intensity,
      ),
    ).toEqual([8, 8, 8]);
    // Asking for the mode it already has keeps what was set.
    expect(
      sets(apply(rpe, (e) => e.editPrescription(DAY, BENCH, (p) => p.setIntensity("rpe")))).map(
        (s) => s.intensity,
      ),
    ).toEqual([9, 8, 8]);
  });

  it("intensity gets a starting value, steps within its bounds, and clears", () => {
    const rpe = apply(withBench, (e) =>
      e.editPrescription(DAY, BENCH, (p) => p.setIntensity("rpe")),
    );
    expect(sets(rpe)[0]!.intensity).toBe(8);
    const maxed = apply(
      rpe,
      ...Array<ProgramEdit>(9).fill((e) =>
        e.editPrescription(DAY, BENCH, (p) => p.stepIntensity(0, 1)),
      ),
    );
    expect(sets(maxed)[0]!.intensity).toBe(10);
    const pct = apply(
      withBench,
      (e) => e.editPrescription(DAY, BENCH, (p) => p.setIntensity("pct")),
      (e) => e.editPrescription(DAY, BENCH, (p) => p.stepIntensity(0, -1)),
    );
    expect(sets(pct)[0]!.intensity).toBe(67.5);
    expect(
      sets(apply(rpe, (e) => e.editPrescription(DAY, BENCH, (p) => p.setIntensity("none"))))[0]!
        .intensity,
    ).toBeUndefined();
  });

  it("steps rest in 15 s, not below zero, and stores notes", () => {
    const p = apply(
      withBench,
      (e) => e.editPrescription(DAY, BENCH, (p) => p.stepRest(1)),
      (e) => e.editPrescription(DAY, BENCH, (p) => p.setNotes("slow")),
    );
    expect(p.days[0]!.exercises[0]).toMatchObject({ rest: 135, notes: "slow" });
    const zero = apply(
      withBench,
      ...Array<ProgramEdit>(20).fill((e) => e.editPrescription(DAY, BENCH, (p) => p.stepRest(-1))),
    );
    expect(zero.days[0]!.exercises[0]!.rest).toBe(0);
  });
});
