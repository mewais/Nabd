import { ProgramSchema, workingSets } from "@nabd/domain";

const set = { type: "working", a: 8 };
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
    for (const weekday of [0, 6, null]) expect(accepts(withDay({ weekday })), `${weekday}`).toBe(true);
    for (const weekday of [-1, 7, 1.5]) expect(accepts(withDay({ weekday })), `${weekday}`).toBe(false);
  });

  it("a prescription rests for whole, non-negative seconds and may carry notes", () => {
    expect(accepts(withRow({ notes: "Keep elbows tucked", supersetId: "ss" }))).toBe(true);
    expect(accepts(withRow({ rest: -1 }))).toBe(false);
    expect(accepts(withRow({ rest: 1.5 }))).toBe(false);
    expect(accepts(withRow({ repMode: "amrap" }))).toBe(false);
    expect(accepts(withRow({ intensity: "rir" }))).toBe(false);
  });

  it("a set is a warm-up, a working set or a drop set, with an optional range and intensity", () => {
    expect(accepts(withRow({ sets: [{ type: "warmup", a: 5, b: 10, val: 70 }] }))).toBe(true);
    expect(accepts(withRow({ sets: [{ type: "drop", a: 12 }] }))).toBe(true);
    expect(accepts(withRow({ sets: [{ a: 8 }] }))).toBe(false);
    expect(accepts(withRow({ sets: [{ type: "amrap", a: 8 }] }))).toBe(false);
  });

  it("a cycled slot targets one tracking muscle", () => {
    expect(accepts(withSlot({ muscle: "side_delts", notes: "Go heavy" }))).toBe(true);
    expect(accepts(withSlot({ muscle: "Chest" }))).toBe(false);
  });
});

describe("workingSets", () => {
  it("leaves out the warm-ups and keeps everything else", () => {
    const sets = [
      { type: "warmup" as const, a: 10 },
      { type: "working" as const, a: 8 },
      { type: "drop" as const, a: 12 },
    ];
    expect(workingSets({ sets })).toEqual(sets.slice(1));
  });
});
