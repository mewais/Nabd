import { upgradeStored } from "@nabd/serialization";
import { CATALOG } from "../support/exercises";

const sets = (...list: object[]) => ({ repMode: "range", intensity: "none", rest: 90, sets: list });
const slot = (id: string, pool: string[], ...list: object[]) => ({
  id,
  muscle: "chest",
  pool,
  ...sets(...list),
});
const programOf = (day: object) => ({
  name: "P",
  type: "cycled",
  schedule: "floating",
  days: [day],
});

describe("upgradeStored", () => {
  it("returns the very same values when they are already in today's shape", () => {
    const stored = {
      program: programOf({
        id: "a",
        name: "A",
        weekday: null,
        exercises: [{ id: "r", exId: CATALOG.bench, ...sets({ type: "working", amount: 8 }) }],
        slots: [slot("chest", [CATALOG.bench, CATALOG.fly], { type: "working", amount: 8 })],
      }),
      settings: { theme: "light", glass: false },
      dayState: { date: "2026-11-16", dayId: "a" },
      rotationState: { chest: CATALOG.fly },
    };
    const upgraded = upgradeStored(stored);
    expect(upgraded.program).toBe(stored.program);
    expect(upgraded.settings).toBe(stored.settings);
    expect(upgraded.dayState).toBe(stored.dayState);
    expect(upgraded.rotationState).toBe(stored.rotationState);
  });

  it("leaves what was never saved, and what it cannot make sense of, for validation to judge", () => {
    expect(upgradeStored({ program: null, settings: undefined })).toEqual({
      program: null,
      settings: undefined,
    });
    const garbage = { program: 7, settings: "x", dayState: [], rotationState: "y" };
    expect(upgradeStored(garbage)).toEqual(garbage);
  });

  it("keeps every other field of what it is given", () => {
    const stored = { program: null, history: [1, 2], unreadableSets: 3, dayLog: null };
    expect(upgradeStored(stored)).toEqual(stored);
  });

  it("renames the fields of prescribed sets stored before version 3", () => {
    const old = programOf({
      id: "a",
      exercises: [
        {
          id: "r",
          exId: CATALOG.bench,
          ...sets({ type: "warmup", a: 10 }, { type: "working", a: 8, b: 12, val: 8.5 }),
        },
      ],
      slots: [slot("chest", [], { type: "working", a: 45 })],
    });
    expect(upgradeStored({ program: old }).program).toMatchObject({
      days: [
        {
          exercises: [
            {
              sets: [
                { type: "warmup", amount: 10 },
                { type: "working", amount: 8, upTo: 12, intensity: 8.5 },
              ],
            },
          ],
          slots: [{ sets: [{ type: "working", amount: 45 }] }],
        },
      ],
    });
  });

  it('reads the old "translucent" theme as the dark theme over a glass window', () => {
    expect(upgradeStored({ settings: { theme: "translucent", interval: 30 } }).settings).toEqual({
      theme: "dark",
      glass: true,
      interval: 30,
    });
  });

  it("turns an old floating position into the id of the day it pointed at", () => {
    const program = { days: [{ id: "a" }, { id: "b" }] };
    const dayState = { date: "2026-11-16", floatingIndex: 3 };
    expect(upgradeStored({ program, dayState }).dayState).toMatchObject({ dayId: "b" });
    // With no plan to point into, the position is the first day.
    expect(upgradeStored({ dayState }).dayState).toMatchObject({ dayId: null });
  });

  it("turns an old pool position into the id of the exercise it pointed at", () => {
    const program = programOf({
      id: "a",
      slots: [slot("chest", ["bench", "fly"]), slot("empty", [])],
    });
    const rotationState = { chest: 3, empty: 2, gone: 1 };
    expect(upgradeStored({ program, rotationState }).rotationState).toEqual({ chest: "fly" });
  });

  describe("exercises the catalog has retired", () => {
    const retired = "row__barbell__uni";
    const stored = () => ({
      program: programOf({
        id: "a",
        exercises: [{ id: "r", exId: retired, ...sets({ type: "working", amount: 8 }) }],
        slots: [
          slot("back", [retired, CATALOG.row, "push_up__bodyweight__uni", "my-custom__uni"]),
          slot("arms", ["curl__ezbar__uni"]),
        ],
      }),
      rotationState: { back: retired, arms: "curl__ezbar__uni" },
    });

    it("gives a single-arm variant of two-handed equipment to the two-handed exercise", () => {
      const { program } = upgradeStored(stored());
      expect(program).toMatchObject({ days: [{ exercises: [{ exId: CATALOG.row }] }] });
    });

    it("lists the replacement once in a pool, and leaves every other id alone", () => {
      const { program } = upgradeStored(stored());
      expect(program).toMatchObject({
        days: [
          {
            slots: [
              // A one-arm push-up is still in the catalog; a custom id is nobody's to rename.
              { pool: [CATALOG.row, "push_up__bodyweight__uni", "my-custom__uni"] },
              { pool: ["curl__ezbar"] },
            ],
          },
        ],
      });
    });

    it("moves a rotation that pointed at one on to its replacement", () => {
      expect(upgradeStored(stored()).rotationState).toEqual({
        back: CATALOG.row,
        arms: "curl__ezbar",
      });
    });
  });
});
