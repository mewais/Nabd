import {
  NO_SETS,
  ProgramSchema,
  countSets,
  firstDay,
  inWeekOrder,
  totalSets,
  workingSets,
} from "@nabd/domain";
import type { Day, Weekday } from "@nabd/domain";

const set = { type: "working", amount: 8 };
const row = { id: "p1", exId: "bench", repMode: "range", intensity: "pct", rest: 120, sets: [set] };
const slot = {
  id: "slot1",
  muscle: "chest",
  pool: ["bench", "incline"],
  repMode: "fixed",
  intensity: "none",
  rest: 90,
  sets: [set],
};
const day = { id: "day1", name: "Day 1", weekday: 1, exercises: [row], slots: [] };
const program = { name: "My Program", type: "fixed", schedule: "weekday", days: [day] };

const accepts = (value: unknown): boolean => ProgramSchema.safeParse(value).success;

describe("ProgramSchema", () => {
  it("accepts a fixed weekday plan and a cycled floating one", () => {
    expect(accepts(program)).toBe(true);
    expect(
      accepts({
        ...program,
        type: "cycled",
        schedule: "floating",
        days: [{ ...day, weekday: null, exercises: [], slots: [slot] }],
      }),
    ).toBe(true);
  });
});

describe("counts of sets by kind", () => {
  it("count each kind in a list of kinds, and add up to the whole", () => {
    expect(countSets([])).toEqual(NO_SETS);
    const counts = countSets(["warmup", "working", "working", "drop"]);
    expect(counts).toEqual({ warmup: 1, working: 2, drop: 1 });
    expect(totalSets(counts)).toBe(4);
  });
});

describe("workingSets", () => {
  it("leaves out the warm-ups and keeps everything else", () => {
    const sets = [
      { type: "warmup" as const, amount: 10 },
      { type: "working" as const, amount: 8 },
      { type: "drop" as const, amount: 12 },
    ];
    expect(workingSets({ sets })).toEqual(sets.slice(1));
  });
});

describe("the order of a plan's days", () => {
  const day = (id: string, weekday: Weekday | null): Day => ({
    id,
    name: id,
    weekday,
    exercises: [],
    slots: [],
  });
  const days = [day("sun", 0), day("loose", null), day("wed", 3), day("mon", 1)];

  it("a week runs from Monday to Sunday; days on no weekday come last", () => {
    expect(inWeekOrder(days).map((d) => d.id)).toEqual(["mon", "wed", "sun", "loose"]);
    expect(days.map((d) => d.id)).toEqual(["sun", "loose", "wed", "mon"]);
  });

  it("a weekday plan starts with its earliest day of the week, a floating one with its first", () => {
    expect(firstDay({ schedule: "weekday", days })?.id).toBe("mon");
    expect(firstDay({ schedule: "floating", days })?.id).toBe("sun");
    expect(firstDay({ schedule: "weekday", days: [] })).toBeUndefined();
  });
});
