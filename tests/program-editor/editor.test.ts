import type { Program } from "@nabd/domain";
import { EMPTY_PROGRAM } from "@nabd/domain";
import { ProgramEditor, daySummary, normalized } from "@nabd/program-editor";
import type { EditRef, PlanToday, ProgramEdit } from "@nabd/program-editor";
import { exercise, lookupIn } from "../support/domain-factories";

const bench = exercise({ name: "Bench", group: "Chest" });
const fly = exercise({ name: "Fly", group: "Chest" });
const row = exercise({ name: "Row", group: "Back", primary: ["lats"] });
const plank = exercise({ name: "Plank", group: "Abs", primary: ["abs"], tracking: "duration" });
const crunch = exercise({ name: "Crunch", group: "Abs", primary: ["abs"] });
const hollow = exercise({ name: "Hollow", group: "Abs", primary: ["abs"], tracking: "duration" });
const lookup = lookupIn([bench, fly, row, plank, crunch, hollow]);

let counter = 0;

/** A Wednesday on which the plan is on no day in particular (so, on its first). */
const WEDNESDAY: PlanToday = { weekday: 3, dayId: null };

/** Apply edits in order on a day that stands as `today`, generating ids n1, n2, … that never repeat. */
function applyOn(today: PlanToday, program: Program, ...edits: ProgramEdit[]): Program {
  return edits.reduce(
    (current, edit) => edit(new ProgramEditor(current, () => `n${++counter}`, lookup, today)),
    program,
  );
}

const apply = (program: Program, ...edits: ProgramEdit[]): Program =>
  applyOn(WEDNESDAY, program, ...edits);

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

  describe("switching schedule keeps today on its day", () => {
    const floating = apply(
      { ...EMPTY_PROGRAM, schedule: "floating" },
      (e) => e.addDay(null),
      (e) => e.addDay(null),
      (e) => e.addDay(null),
    );
    const [d1, d2, d3] = floating.days.map((d) => d.id) as [string, string, string];
    const weekdays = (p: Program) => Object.fromEntries(p.days.map((d) => [d.id, d.weekday]));

    it("going weekday pins the day the plan is on to today, and the rest to the days after", () => {
      // On Day 2 on a Wednesday: Day 2 is Wednesday's, Day 3 Thursday's, Day 1 Friday's.
      const placed = applyOn({ weekday: 3, dayId: d2 }, floating, (e) => e.setSchedule("weekday"));
      expect(weekdays(placed)).toEqual({ [d2]: 3, [d3]: 4, [d1]: 5 });
      // The week wraps round: from a Saturday, the days after it are Sunday and Monday.
      const late = applyOn({ weekday: 6, dayId: d1 }, floating, (e) => e.setSchedule("weekday"));
      expect(weekdays(late)).toEqual({ [d1]: 6, [d2]: 0, [d3]: 1 });
    });

    it("going floating unpins the days, so an old placement cannot come back later", () => {
      const placed = applyOn({ weekday: 3, dayId: d2 }, floating, (e) => e.setSchedule("weekday"));
      const back = apply(placed, (e) => e.setSchedule("floating"));
      expect(back.days.map((d) => d.weekday)).toEqual([null, null, null]);
      const again = applyOn({ weekday: 1, dayId: d3 }, back, (e) => e.setSchedule("weekday"));
      expect(weekdays(again)).toMatchObject({ [d3]: 1 });
    });

    it("choosing the schedule the plan already has changes nothing", () => {
      expect(apply(floating, (e) => e.setSchedule("floating"))).toBe(floating);
    });
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
    // One day per weekday, from today (a Wednesday) on.
    expect(apply(seven, (e) => e.setSchedule("weekday")).days.map((d) => d.weekday)).toEqual([
      3, 4, 5, 6, 0, 1, 2,
    ]);
  });

  it("going floating orders the days as they ran through the week, Monday first", () => {
    const weekdays = apply(
      EMPTY_PROGRAM,
      (e) => e.addDay(0),
      (e) => e.addDay(5),
      (e) => e.addDay(1),
    );
    const [sunday, friday, monday] = weekdays.days.map((d) => d.id);
    const floating = apply(weekdays, (e) => e.setSchedule("floating"));
    expect(floating.days.map((d) => d.id)).toEqual([monday, friday, sunday]);
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

  describe("a superset stays together when exercises move", () => {
    // Row, then the superset Bench + Fly, then Plank.
    const built = apply(
      oneDay,
      (e) => e.addExercise(DAY, row.id),
      (e) => e.addExercise(DAY, bench.id),
      (e) => e.addExercise(DAY, fly.id),
      (e) => e.addExercise(DAY, plank.id),
    );
    const [r, b, f, p] = built.days[0]!.exercises.map((x) => x.id) as [
      string,
      string,
      string,
      string,
    ];
    const day = apply(built, (e) => e.toggleSuperset(DAY, b));
    const layout = (program: Program) =>
      program.days[0]!.exercises.map((x) => [x.id, x.supersetId !== undefined]);

    it("an exercise on its own steps over the whole superset, never into it", () => {
      expect(layout(apply(day, (e) => e.moveExercise(DAY, r, 1)))).toEqual([
        [b, true],
        [f, true],
        [r, false],
        [p, false],
      ]);
      expect(layout(apply(day, (e) => e.moveExercise(DAY, p, -1)))).toEqual([
        [r, false],
        [p, false],
        [b, true],
        [f, true],
      ]);
    });

    it("a member trades places with the partner beside it", () => {
      expect(layout(apply(day, (e) => e.moveExercise(DAY, b, 1)))).toEqual([
        [r, false],
        [f, true],
        [b, true],
        [p, false],
      ]);
    });

    it("a member moved out past the edge leaves the superset, where it stands", () => {
      // Of two members, the one left behind is no superset on its own.
      expect(layout(apply(day, (e) => e.moveExercise(DAY, b, -1)))).toEqual([
        [r, false],
        [b, false],
        [f, false],
        [p, false],
      ]);
      // Of three, the other two stay linked.
      const three = apply(day, (e) => e.toggleSuperset(DAY, r));
      expect(layout(apply(three, (e) => e.moveExercise(DAY, f, 1)))).toEqual([
        [r, true],
        [b, true],
        [f, false],
        [p, false],
      ]);
    });

    it("removing a member of a pair dissolves the superset", () => {
      const left = apply(day, (e) => e.removeExercise(DAY, f));
      expect(left.days[0]!.exercises.every((x) => x.supersetId === undefined)).toBe(true);
    });
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

  it("switching between a range and fixed reps adds or drops the top of the range", () => {
    const fixed = apply(withBench, (e) => e.setRepStyle(DAY, BENCH, "fixed"));
    expect(sets(fixed)[0]).toEqual({ type: "working", a: 8 });
    expect(sets(apply(fixed, (e) => e.setRepStyle(DAY, BENCH, "range")))[0]).toMatchObject({
      a: 8,
      b: 10,
    });
    const unchanged = apply(withBench, (e) => e.setRepStyle(DAY, BENCH, "range"));
    expect(sets(unchanged)[0]).toEqual({ type: "working", a: 8, b: 12 });
  });

  it("a timed exercise is prescribed in seconds, whatever rep style is asked for", () => {
    const timed = apply(oneDay, (e) => e.addExercise(DAY, plank.id));
    const PLANK: EditRef = { kind: "exercise", id: timed.days[0]!.exercises[0]!.id };
    expect(sets(apply(timed, (e) => e.stepRep(DAY, PLANK, 0, "a", 1)))[0]!.a).toBe(50);
    for (const style of ["range", "fixed"] as const) {
      const asked = apply(timed, (e) => e.setRepStyle(DAY, PLANK, style));
      expect(asked.days[0]!.exercises[0]!.repMode).toBe("time");
      expect(sets(asked)[0]).toEqual({ type: "working", a: 45 });
    }
  });

  it("switching the load mode starts every set from the new scale's usual value", () => {
    const rpe = apply(
      withBench,
      (e) => e.setIntensity(DAY, BENCH, "rpe"),
      (e) => e.stepIntensity(DAY, BENCH, 0, 1),
      (e) => e.stepIntensity(DAY, BENCH, 0, 1),
    );
    expect(sets(rpe).map((s) => s.val)).toEqual([9, 8, 8]);
    // An RPE of 9 must not come back as 9% of a one-rep max.
    const pct = apply(rpe, (e) => e.setIntensity(DAY, BENCH, "pct"));
    expect(sets(pct).map((s) => s.val)).toEqual([70, 70, 70]);
    expect(sets(apply(pct, (e) => e.setIntensity(DAY, BENCH, "rpe"))).map((s) => s.val)).toEqual([
      8, 8, 8,
    ]);
    // Asking for the mode it already has keeps what was set.
    expect(sets(apply(rpe, (e) => e.setIntensity(DAY, BENCH, "rpe"))).map((s) => s.val)).toEqual([
      9, 8, 8,
    ]);
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
      (e) => e.addPoolExercise(DAY, abs.id, crunch.id),
      (e) => e.addPoolExercise(DAY, abs.id, crunch.id),
      (e) => e.moveSlot(DAY, abs.id, -1),
      (e) => e.addSet(DAY, { kind: "slot", id: abs.id }),
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
        sets: [{ a: 45 }, { a: 45 }, { a: 45 }],
      });
      expect(slot(timed).sets.every((set) => set.b === undefined)).toBe(true);
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
      expect(slot(reps).sets[0]).toEqual({ type: "working", a: 8, b: 12 });
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

describe("normalized — a program as it was stored", () => {
  const stored = (day: Partial<Program["days"][number]>): Program => ({
    ...oneDay,
    days: [{ ...oneDay.days[0]!, ...day }],
  });
  const reps = { repMode: "range", intensity: "none", rest: 90 } as const;

  it("is the very same program when it already obeys the rules", () => {
    expect(normalized(withBench, lookup)).toBe(withBench);
  });

  it("prescribes each exercise in its own measure, without touching the original", () => {
    const program = stored({
      exercises: [
        { id: "r1", exId: plank.id, ...reps, sets: [{ type: "working", a: 8, b: 12 }] },
        { id: "r2", exId: bench.id, ...reps, repMode: "time", sets: [{ type: "working", a: 45 }] },
        { id: "r3", exId: "gone", ...reps, repMode: "time", sets: [{ type: "working", a: 45 }] },
      ],
    });
    const before = structuredClone(program);
    expect(normalized(program, lookup).days[0]!.exercises).toMatchObject([
      { repMode: "time", sets: [{ type: "working", a: 45 }] },
      { repMode: "range", sets: [{ type: "working", a: 8, b: 12 }] },
      // An exercise the library does not know is left as it was written.
      { repMode: "time", sets: [{ type: "working", a: 45 }] },
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
          sets: [{ type: "working", a: 8, b: 12 }],
        },
      ],
    });
    expect(normalized(program, lookup).days[0]!.slots[0]).toMatchObject({
      pool: [plank.id, hollow.id, "gone"],
      repMode: "time",
      sets: [{ type: "working", a: 45 }],
    });
  });

  it("brings the scattered members of a superset together, and drops a superset of one", () => {
    const one = (id: string, exId: string, supersetId?: string) => ({
      id,
      exId,
      ...reps,
      sets: [{ type: "working" as const, a: 8, b: 12 }],
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
