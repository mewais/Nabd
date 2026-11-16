import {
  INTENSITY_SCALES,
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
const withDay = (patch: object): object => ({ ...program, days: [{ ...day, ...patch }] });
const withRow = (patch: object): object => withDay({ exercises: [{ ...row, ...patch }] });
const withSlot = (patch: object): object => withDay({ slots: [{ ...slot, ...patch }] });

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

  it("knows only its own plan types and schedules", () => {
    expect(accepts({ ...program, type: "random" })).toBe(false);
    expect(accepts({ ...program, schedule: "daily" })).toBe(false);
  });

  it("pins a day to a weekday 0–6, or to none", () => {
    for (const weekday of [0, 6, null])
      expect(accepts(withDay({ weekday })), `${weekday}`).toBe(true);
    for (const weekday of [-1, 7, 1.5])
      expect(accepts(withDay({ weekday })), `${weekday}`).toBe(false);
  });

  it("a prescription rests for whole, non-negative seconds and may carry notes", () => {
    expect(accepts(withRow({ notes: "Keep elbows tucked", supersetId: "ss" }))).toBe(true);
    expect(accepts(withRow({ rest: -1 }))).toBe(false);
    expect(accepts(withRow({ rest: 1.5 }))).toBe(false);
    expect(accepts(withRow({ repMode: "amrap" }))).toBe(false);
    expect(accepts(withRow({ intensity: "rir" }))).toBe(false);
  });

  it("a set is a warm-up, a working set or a drop set, with an optional range and intensity", () => {
    expect(
      accepts(withRow({ sets: [{ type: "warmup", amount: 5, upTo: 10, intensity: 70 }] })),
    ).toBe(true);
    expect(accepts(withRow({ sets: [{ type: "drop", amount: 12 }] }))).toBe(true);
    expect(accepts(withRow({ sets: [{ a: 8 }] }))).toBe(false);
    expect(accepts(withRow({ sets: [{ type: "amrap", amount: 8 }] }))).toBe(false);
  });

  it("a cycled slot targets one tracking muscle", () => {
    expect(accepts(withSlot({ muscle: "side_delts", notes: "Go heavy" }))).toBe(true);
    expect(accepts(withSlot({ muscle: "Chest" }))).toBe(false);
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

describe("the intensity scales", () => {
  it("are RPE 5–10 and 40–100 %1RM, each starting from a usual value inside", () => {
    expect(INTENSITY_SCALES.rpe).toMatchObject({ min: 5, max: 10, initial: 8 });
    expect(INTENSITY_SCALES.pct).toMatchObject({ min: 40, max: 100, initial: 70 });
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
