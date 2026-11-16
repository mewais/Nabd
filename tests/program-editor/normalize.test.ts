import type { Program } from "@nabd/domain";
import { normalized } from "@nabd/program-editor";
import { bench, fly, row, plank, crunch, hollow, lookup, withBench, oneDay } from "./fixtures";

describe("normalized — a program as it was stored", () => {
  const stored = (day: Partial<Program["days"][number]>): Program => ({
    ...oneDay,
    days: [{ ...oneDay.days[0]!, ...day }],
  });
  const reps = { repMode: "range", intensity: "none", rest: 90 } as const;

  it("holds every intensity to its scale, as the planner's steppers do", () => {
    const program = stored({
      exercises: [
        {
          id: "r1",
          exId: bench.id,
          ...reps,
          intensity: "rpe",
          sets: [
            { type: "working", amount: 8, intensity: 50 },
            { type: "working", amount: 8, intensity: 2 },
            { type: "working", amount: 8 },
          ],
        },
        {
          id: "r2",
          exId: row.id,
          ...reps,
          intensity: "pct",
          sets: [{ type: "working", amount: 8, intensity: 120 }],
        },
        {
          id: "r3",
          exId: fly.id,
          ...reps,
          sets: [{ type: "working", amount: 8, intensity: 70 }],
        },
      ],
    });
    const [rpe, pct, none] = normalized(program, lookup).days[0]!.exercises;
    expect(rpe!.sets.map((set) => set.intensity)).toEqual([10, 5, 8]);
    expect(pct!.sets.map((set) => set.intensity)).toEqual([100]);
    expect(none!.sets[0]).not.toHaveProperty("intensity");
  });

  it("is the very same program when it already obeys the rules", () => {
    expect(normalized(withBench, lookup)).toBe(withBench);
  });

  it("prescribes each exercise in its own measure, without touching the original", () => {
    const program = stored({
      exercises: [
        { id: "r1", exId: plank.id, ...reps, sets: [{ type: "working", amount: 8, upTo: 12 }] },
        {
          id: "r2",
          exId: bench.id,
          ...reps,
          repMode: "time",
          sets: [{ type: "working", amount: 45 }],
        },
        {
          id: "r3",
          exId: "gone",
          ...reps,
          repMode: "time",
          sets: [{ type: "working", amount: 45 }],
        },
      ],
    });
    const before = structuredClone(program);
    expect(normalized(program, lookup).days[0]!.exercises).toMatchObject([
      { repMode: "time", sets: [{ type: "working", amount: 45 }] },
      { repMode: "range", sets: [{ type: "working", amount: 8, upTo: 12 }] },
      // An exercise the library does not know is left as it was written.
      { repMode: "time", sets: [{ type: "working", amount: 45 }] },
    ]);
    expect(program).toEqual(before);
  });

  it("keeps a mixed pool to the kind of its first exercise", () => {
    const program = stored({
      slots: [
        {
          id: "s1",
          muscle: "abs",
          pool: [plank.id, crunch.id, hollow.id, "gone"],
          ...reps,
          sets: [{ type: "working", amount: 8, upTo: 12 }],
        },
      ],
    });
    expect(normalized(program, lookup).days[0]!.slots[0]).toMatchObject({
      pool: [plank.id, hollow.id, "gone"],
      repMode: "time",
      sets: [{ type: "working", amount: 45 }],
    });
  });

  it("brings the scattered members of a superset together, and drops a superset of one", () => {
    const one = (id: string, exId: string, supersetId?: string) => ({
      id,
      exId,
      ...reps,
      sets: [{ type: "working" as const, amount: 8, upTo: 12 }],
      ...(supersetId === undefined ? {} : { supersetId }),
    });
    const program = stored({
      exercises: [
        one("r1", bench.id, "ss"),
        one("r2", row.id),
        one("r3", fly.id, "ss"),
        one("r4", crunch.id, "alone"),
      ],
    });
    expect(normalized(program, lookup).days[0]!.exercises.map((x) => [x.id, x.supersetId])).toEqual(
      [
        ["r1", "ss"],
        ["r3", "ss"],
        ["r2", undefined],
        ["r4", undefined],
      ],
    );
  });
});
