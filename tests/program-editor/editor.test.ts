import type { Program } from "@nabd/domain";
import { EMPTY_PROGRAM } from "@nabd/domain";
import { ProgramEditor, daySummary } from "@nabd/program-editor";
import type { EditRef, ProgramEdit } from "@nabd/program-editor";
import { exercise, lookupIn } from "../support/domain-factories";

const bench = exercise({ name: "Bench", group: "Chest" });
const fly = exercise({ name: "Fly", group: "Chest" });
const row = exercise({ name: "Row", group: "Back", primary: ["lats"] });
const plank = exercise({ name: "Plank", group: "Abs", primary: ["abs"], tracking: "duration" });
const lookup = lookupIn([bench, fly, row, plank]);

let counter = 0;

/** Apply edits in order, generating ids n1, n2, … that never repeat. */
function apply(program: Program, ...edits: ProgramEdit[]): Program {
  return edits.reduce(
    (current, edit) => edit(new ProgramEditor(current, () => `n${++counter}`, lookup)),
    program,
  );
}

/** Types an edit where it cannot be inferred (spread into `apply`). */
const edit = (change: ProgramEdit): ProgramEdit => change;

const oneDay = apply(EMPTY_PROGRAM, (e) => e.addDay(1));
const DAY = oneDay.days[0]!.id;
const withBench = apply(oneDay, (e) => e.addExercise(DAY, bench.id));
const BENCH: EditRef = { kind: "exercise", id: withBench.days[0]!.exercises[0]!.id };
const sets = (p: Program, i = 0) => p.days[0]!.exercises[i]!.sets;

describe("ProgramEditor — program and days", () => {
  it("never mutates the program it was given", () => {
    const before = structuredClone(withBench);
    apply(
      withBench,
      (e) => e.addSet(DAY, BENCH),
      (e) => e.rename("X"),
      (e) => e.removeDay(DAY),
    );
    expect(withBench).toEqual(before);
  });

  it("renames, adds, renames and removes days", () => {
    const p = apply(
      oneDay,
      (e) => e.rename("PPL"),
      (e) => e.renameDay(DAY, "Push"),
      (e) => e.addDay(null),
    );
    expect(p.name).toBe("PPL");
    expect(p.days.map((d) => [d.name, d.weekday])).toEqual([
      ["Push", 1],
      ["New day", null],
    ]);
    expect(apply(p, (e) => e.removeDay(DAY)).days).toHaveLength(1);
  });

  it("putting a day on a taken weekday swaps the two days", () => {
    const two = apply(oneDay, (e) => e.addDay(3));
    const swapped = apply(two, (e) => e.setWeekday(DAY, 3));
    expect(swapped.days.map((d) => d.weekday)).toEqual([3, 1]);
    expect(apply(two, (e) => e.setWeekday(DAY, 5)).days.map((d) => d.weekday)).toEqual([5, 3]);
  });

  it("switching to a weekday schedule places unplaced days on free weekdays", () => {
    const floating = apply(
      { ...EMPTY_PROGRAM, schedule: "floating" },
      (e) => e.addDay(null),
      (e) => e.addDay(2),
      (e) => e.addDay(null),
    );
    const placed = apply(floating, (e) => e.setSchedule("weekday"));
    expect(placed.days.map((d) => d.weekday)).toEqual([1, 2, 3]);
    expect(apply(placed, (e) => e.setSchedule("floating")).days.map((d) => d.weekday)).toEqual([
      1, 2, 3,
    ]);
  });

  it("a weekday schedule takes at most one day per weekday", () => {
    const week = apply(
      EMPTY_PROGRAM,
      ...[1, 2, 3, 4, 5, 6, 0].map((wd) => edit((e) => e.addDay(wd))),
    );
    expect(week.days).toHaveLength(7);
    expect(apply(week, (e) => e.addDay(null))).toBe(week);

    const floating = apply(week, (e) => e.setSchedule("floating"));
    expect(apply(floating, (e) => e.addDay(null)).days).toHaveLength(8);
  });

  it("refuses a weekday schedule for a plan with more days than a week", () => {
    const eight = apply(
      { ...EMPTY_PROGRAM, schedule: "floating" },
      ...Array.from({ length: 8 }, () => edit((e) => e.addDay(null))),
    );
    expect(apply(eight, (e) => e.setSchedule("weekday"))).toBe(eight);
    const seven = apply(eight, (e) => e.removeDay(eight.days[7]!.id));
    expect(apply(seven, (e) => e.setSchedule("weekday")).days.map((d) => d.weekday)).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
  });

  it("going floating orders the days as they ran through the week, Monday first", () => {
    const weekdays = apply(
      EMPTY_PROGRAM,
      (e) => e.addDay(0),
      (e) => e.addDay(5),
      (e) => e.addDay(1),
    );
    const floating = apply(weekdays, (e) => e.setSchedule("floating"));
    expect(floating.days.map((d) => d.weekday)).toEqual([1, 5, 0]);
  });

  it("moves a day within the order, ignoring moves off either end", () => {
    const three = apply(
      oneDay,
      (e) => e.addDay(2),
      (e) => e.addDay(3),
    );
    const ids = three.days.map((d) => d.id);
    expect(apply(three, (e) => e.moveDay(ids[0]!, 1)).days.map((d) => d.id)).toEqual([
      ids[1],
      ids[0],
      ids[2],
    ]);
    expect(apply(three, (e) => e.moveDay(ids[0]!, -1)).days.map((d) => d.id)).toEqual(ids);
    expect(apply(three, (e) => e.moveDay(ids[2]!, 1)).days.map((d) => d.id)).toEqual(ids);
  });
});

describe("ProgramEditor — exercises", () => {
  it("adds an exercise with a default prescription suited to how it is tracked", () => {
    expect(withBench.days[0]!.exercises[0]).toMatchObject({
      exId: bench.id,
      repMode: "range",
      rest: 120,
      sets: [
        { type: "working", a: 8, b: 12 },
        { type: "working", a: 8, b: 12 },
        { type: "working", a: 8, b: 12 },
      ],
    });
    const timed = apply(oneDay, (e) => e.addExercise(DAY, plank.id)).days[0]!.exercises[0]!;
    expect(timed).toMatchObject({
      repMode: "time",
      rest: 60,
      sets: [{ a: 45 }, { a: 45 }, { a: 45 }],
    });
    expect(apply(oneDay, (e) => e.addExercise(DAY, "nope"))).toEqual(oneDay);
  });

  it("removes and reorders exercises", () => {
    const three = apply(
      withBench,
      (e) => e.addExercise(DAY, fly.id),
      (e) => e.addExercise(DAY, row.id),
    );
    const [a, b, c] = three.days[0]!.exercises.map((x) => x.id) as [string, string, string];
    const order = (p: Program) => p.days[0]!.exercises.map((x) => x.id);
    expect(order(apply(three, (e) => e.moveExercise(DAY, a, 1)))).toEqual([b, a, c]);
    expect(order(apply(three, (e) => e.moveExercise(DAY, c, 1)))).toEqual([a, b, c]);
    expect(order(apply(three, (e) => e.removeExercise(DAY, b)))).toEqual([a, c]);
  });

  it("links an exercise with the next one as a superset, and unlinks the whole group", () => {
    const two = apply(withBench, (e) => e.addExercise(DAY, fly.id));
    const linked = apply(two, (e) => e.toggleSuperset(DAY, BENCH.id));
    const [first, second] = linked.days[0]!.exercises;
    expect(first!.supersetId).toBeDefined();
    expect(second!.supersetId).toBe(first!.supersetId);
    // Either member dissolves the superset.
    for (const member of [first!, second!]) {
      const unlinked = apply(linked, (e) => e.toggleSuperset(DAY, member.id));
      expect(unlinked.days[0]!.exercises.every((x) => x.supersetId === undefined)).toBe(true);
    }
    // Linking an exercise placed before a superset joins it.
    const lead = apply(two, (e) => e.addExercise(DAY, row.id));
    const tailLinked = apply(lead, (e) => e.toggleSuperset(DAY, second!.id));
    const joined = apply(tailLinked, (e) => e.toggleSuperset(DAY, BENCH.id));
    expect(new Set(joined.days[0]!.exercises.map((x) => x.supersetId)).size).toBe(1);
    // The last exercise has nothing after it to link with.
    expect(apply(two, (e) => e.toggleSuperset(DAY, second!.id))).toEqual(two);
  });

  it("purges a deleted exercise from every day and pool", () => {
    const cycled = apply(
      withBench,
      (e) => e.addExercise(DAY, fly.id),
      (e) => e.setType("cycled"),
      (e) => e.purgeExercise(bench.id),
    );
    expect(cycled.days[0]!.exercises.map((x) => x.exId)).toEqual([fly.id]);
    expect(cycled.days[0]!.slots[0]!.pool).toEqual([fly.id]);
  });
});

describe("ProgramEditor — prescriptions", () => {
  it("adds sets and warm-ups, and never removes the last set", () => {
    const more = apply(
      withBench,
      (e) => e.addSet(DAY, BENCH),
      (e) => e.addWarmup(DAY, BENCH),
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
      (e) => e.removeSet(DAY, BENCH, 0),
      (e) => e.removeSet(DAY, BENCH, 0),
    );
    expect(sets(one)).toHaveLength(1);
    expect(sets(apply(one, (e) => e.removeSet(DAY, BENCH, 0)))).toHaveLength(1);
  });

  it("cycles a set's type working → warm-up → drop → working", () => {
    const cycle: ProgramEdit = (e) => e.cycleSetType(DAY, BENCH, 0);
    expect(sets(apply(withBench, cycle))[0]!.type).toBe("warmup");
    expect(sets(apply(withBench, cycle, cycle))[0]!.type).toBe("drop");
    expect(sets(apply(withBench, cycle, cycle, cycle))[0]!.type).toBe("working");
  });

  it("steps reps while keeping the range ordered and at least one rep", () => {
    const up = apply(
      withBench,
      ...Array<ProgramEdit>(6).fill((e) => e.stepRep(DAY, BENCH, 0, "a", 1)),
    );
    expect(sets(up)[0]).toMatchObject({ a: 14, b: 14 });
    const down = apply(
      withBench,
      ...Array<ProgramEdit>(9).fill((e) => e.stepRep(DAY, BENCH, 0, "b", -1)),
    );
    expect(sets(down)[0]).toMatchObject({ a: 8, b: 8 });
    const floor = apply(
      withBench,
      ...Array<ProgramEdit>(20).fill((e) => e.stepRep(DAY, BENCH, 0, "a", -1)),
    );
    expect(sets(floor)[0]!.a).toBe(1);
  });

  it("switching between rep modes adds or drops the top of the range", () => {
    const fixed = apply(withBench, (e) => e.setRepMode(DAY, BENCH, "fixed"));
    expect(sets(fixed)[0]).toEqual({ type: "working", a: 8 });
    expect(sets(apply(fixed, (e) => e.setRepMode(DAY, BENCH, "range")))[0]).toMatchObject({
      a: 8,
      b: 10,
    });
    const unchanged = apply(withBench, (e) => e.setRepMode(DAY, BENCH, "range"));
    expect(sets(unchanged)[0]).toEqual({ type: "working", a: 8, b: 12 });
  });

  it("switching between time and reps starts from that mode's defaults", () => {
    const timed = apply(withBench, (e) => e.setRepMode(DAY, BENCH, "time"));
    expect(sets(timed)).toEqual(Array(3).fill({ type: "working", a: 45 }));
    expect(sets(apply(timed, (e) => e.stepRep(DAY, BENCH, 0, "a", 1)))[0]!.a).toBe(50);

    // 45 seconds must not come back as 45 reps.
    expect(sets(apply(timed, (e) => e.setRepMode(DAY, BENCH, "range")))[0]).toEqual({
      type: "working",
      a: 8,
      b: 12,
    });
    expect(sets(apply(timed, (e) => e.setRepMode(DAY, BENCH, "fixed")))[0]).toEqual({
      type: "working",
      a: 8,
    });
  });

  it("intensity gets a starting value, steps within its bounds, and clears", () => {
    const rpe = apply(withBench, (e) => e.setIntensity(DAY, BENCH, "rpe"));
    expect(sets(rpe)[0]!.val).toBe(8);
    const maxed = apply(
      rpe,
      ...Array<ProgramEdit>(9).fill((e) => e.stepIntensity(DAY, BENCH, 0, 1)),
    );
    expect(sets(maxed)[0]!.val).toBe(10);
    const pct = apply(
      withBench,
      (e) => e.setIntensity(DAY, BENCH, "pct"),
      (e) => e.stepIntensity(DAY, BENCH, 0, -1),
    );
    expect(sets(pct)[0]!.val).toBe(67.5);
    expect(sets(apply(rpe, (e) => e.setIntensity(DAY, BENCH, "none")))[0]!.val).toBeUndefined();
  });

  it("steps rest in 15 s, not below zero, and stores notes", () => {
    const p = apply(
      withBench,
      (e) => e.stepRest(DAY, BENCH, 1),
      (e) => e.setNotes(DAY, BENCH, "slow"),
    );
    expect(p.days[0]!.exercises[0]).toMatchObject({ rest: 135, notes: "slow" });
    const zero = apply(
      withBench,
      ...Array<ProgramEdit>(20).fill((e) => e.stepRest(DAY, BENCH, -1)),
    );
    expect(zero.days[0]!.exercises[0]!.rest).toBe(0);
  });
});

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
      (e) => e.addPoolExercise(DAY, abs.id, plank.id),
      (e) => e.addPoolExercise(DAY, abs.id, plank.id),
      (e) => e.moveSlot(DAY, abs.id, -1),
      (e) => e.addSet(DAY, { kind: "slot", id: abs.id }),
    );
    expect(pooled.days[0]!.slots.map((s) => s.muscle)).toEqual(["chest", "abs", "lats"]);
    expect(pooled.days[0]!.slots[1]).toMatchObject({ pool: [plank.id] });
    expect(pooled.days[0]!.slots[1]!.sets).toHaveLength(4);
    const emptied = apply(pooled, (e) => e.removePoolExercise(DAY, abs.id, plank.id));
    expect(emptied.days[0]!.slots[1]!.pool).toEqual([]);
  });
});

describe("daySummary", () => {
  it("counts exercises or muscles, and their sets", () => {
    const day = apply(
      withBench,
      (e) => e.addExercise(DAY, row.id),
      (e) => e.setType("cycled"),
    ).days[0]!;
    expect(daySummary(day, "fixed")).toBe("2 exercises · 6 sets");
    expect(daySummary(day, "cycled")).toBe("2 muscles · 6 sets");
  });
});
