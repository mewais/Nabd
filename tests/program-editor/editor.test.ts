import type { Program } from "@nabd/domain";
import { EMPTY_PROGRAM, WEEK_ORDER } from "@nabd/domain";
import {
  bench,
  fly,
  row,
  plank,
  applyOn,
  apply,
  edit,
  oneDay,
  DAY,
  withBench,
  BENCH,
} from "./fixtures";

describe("ProgramEditor — program and days", () => {
  it("never mutates the program it was given", () => {
    const before = structuredClone(withBench);
    apply(
      withBench,
      (e) => e.editPrescription(DAY, BENCH, (p) => p.addSet()),
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
    const week = apply(EMPTY_PROGRAM, ...WEEK_ORDER.map((wd) => edit((e) => e.addDay(wd))));
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
        { type: "working", amount: 8, upTo: 12 },
        { type: "working", amount: 8, upTo: 12 },
        { type: "working", amount: 8, upTo: 12 },
      ],
    });
    const timed = apply(oneDay, (e) => e.addExercise(DAY, plank.id)).days[0]!.exercises[0]!;
    expect(timed).toMatchObject({
      repMode: "time",
      rest: 60,
      sets: [{ amount: 45 }, { amount: 45 }, { amount: 45 }],
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
