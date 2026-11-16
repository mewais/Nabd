import type { Program } from "@nabd/domain";
import { bench, fly, row, plank, crunch, hollow, apply, oneDay, DAY, withBench } from "./fixtures";

describe("ProgramEditor — cycled plans", () => {
  const mixed = apply(
    withBench,
    (e) => e.addExercise(DAY, row.id),
    (e) => e.addExercise(DAY, fly.id),
    (e) => e.setType("cycled"),
  );

  it("going cycled derives one slot per muscle group, pooling that group's exercises", () => {
    const slots = mixed.days[0]!.slots;
    expect(slots.map((s) => [s.muscle, s.pool])).toEqual([
      ["chest", [bench.id, fly.id]],
      ["lats", [row.id]],
    ]);
    expect(slots[0]!.sets).toHaveLength(3);
    // The fixed exercises are kept so switching back loses nothing.
    expect(mixed.days[0]!.exercises).toHaveLength(3);
  });

  it("does not re-derive slots that already exist", () => {
    const edited = apply(mixed, (e) => e.removeSlot(DAY, mixed.days[0]!.slots[1]!.id));
    const again = apply(
      edited,
      (e) => e.setType("fixed"),
      (e) => e.setType("cycled"),
    );
    expect(again.days[0]!.slots).toHaveLength(1);
  });

  it("adds, reorders and edits slots and their pools", () => {
    const p = apply(mixed, (e) => e.addSlot(DAY, "abs"));
    const abs = p.days[0]!.slots[2]!;
    expect(abs).toMatchObject({ muscle: "abs", pool: [], repMode: "range" });
    const pooled = apply(
      p,
      (e) => e.addPoolExercise(DAY, abs.id, crunch.id),
      (e) => e.addPoolExercise(DAY, abs.id, crunch.id),
      (e) => e.moveSlot(DAY, abs.id, -1),
      (e) => e.editPrescription(DAY, { kind: "slot", id: abs.id }, (p) => p.addSet()),
    );
    expect(pooled.days[0]!.slots.map((s) => s.muscle)).toEqual(["chest", "abs", "lats"]);
    expect(pooled.days[0]!.slots[1]).toMatchObject({ pool: [crunch.id] });
    expect(pooled.days[0]!.slots[1]!.sets).toHaveLength(4);
    const emptied = apply(pooled, (e) => e.removePoolExercise(DAY, abs.id, crunch.id));
    expect(emptied.days[0]!.slots[1]!.pool).toEqual([]);
  });

  describe("a pool holds one kind of exercise: counted in reps, or timed", () => {
    const p = apply(
      oneDay,
      (e) => e.setType("cycled"),
      (e) => e.addSlot(DAY, "abs"),
    );
    const ABS = p.days[0]!.slots[0]!.id;
    const slot = (program: Program) => program.days[0]!.slots[0]!;

    it("the first exercise decides, and a timed one starts the prescription afresh in seconds", () => {
      const timed = apply(p, (e) => e.addPoolExercise(DAY, ABS, plank.id));
      expect(slot(timed)).toMatchObject({
        pool: [plank.id],
        repMode: "time",
        sets: [{ amount: 45 }, { amount: 45 }, { amount: 45 }],
      });
      expect(slot(timed).sets.every((set) => set.upTo === undefined)).toBe(true);
    });

    it("an exercise of the other kind is refused; one of the same kind joins", () => {
      const timed = apply(p, (e) => e.addPoolExercise(DAY, ABS, plank.id));
      expect(slot(apply(timed, (e) => e.addPoolExercise(DAY, ABS, crunch.id))).pool).toEqual([
        plank.id,
      ]);
      expect(slot(apply(timed, (e) => e.addPoolExercise(DAY, ABS, hollow.id))).pool).toEqual([
        plank.id,
        hollow.id,
      ]);
      expect(apply(timed, (e) => e.addPoolExercise(DAY, ABS, "nope"))).toBe(timed);
    });

    it("emptied, the pool takes either kind again", () => {
      const reps = apply(
        p,
        (e) => e.addPoolExercise(DAY, ABS, plank.id),
        (e) => e.removePoolExercise(DAY, ABS, plank.id),
        (e) => e.addPoolExercise(DAY, ABS, crunch.id),
      );
      expect(slot(reps)).toMatchObject({ pool: [crunch.id], repMode: "range" });
      expect(slot(reps).sets[0]).toEqual({ type: "working", amount: 8, upTo: 12 });
    });

    it("going cycled keeps a group's timed and rep-counted exercises in separate slots", () => {
      const derived = apply(
        oneDay,
        (e) => e.addExercise(DAY, crunch.id),
        (e) => e.addExercise(DAY, plank.id),
        (e) => e.addExercise(DAY, hollow.id),
        (e) => e.setType("cycled"),
      );
      expect(derived.days[0]!.slots.map((s) => [s.repMode, s.pool])).toEqual([
        ["range", [crunch.id]],
        ["time", [plank.id, hollow.id]],
      ]);
    });
  });
});
