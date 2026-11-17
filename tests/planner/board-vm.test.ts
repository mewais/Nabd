import { EMPTY_PROGRAM } from "@nabd/domain";
import type { Program } from "@nabd/domain";
import { asFloating, officeStrength, rotationPlan } from "../support/programs";
import { dayOf, vmOf } from "./fixtures";

const columns = (program: Program, plannerDayId: string | null = null) =>
  vmOf(program, plannerDayId).board.columns;

/** The day cards of a board, in order. */
const dayCards = (program: Program, plannerDayId: string | null = null) =>
  columns(program, plannerDayId).flatMap((column) => (column.kind === "day" ? [column] : []));

describe("board view-model", () => {
  it("lays a weekday plan out Monday to Sunday with free weekdays in the gaps", () => {
    const board = vmOf(officeStrength()).board;

    expect(board.schedule).toBe("weekday");
    expect(board.columns.map((c) => [c.kind, c.kind === "add" ? null : c.label])).toEqual([
      ["day", "Mon"],
      ["rest", "Tue"],
      ["day", "Wed"],
      ["rest", "Thu"],
      ["rest", "Fri"],
      ["rest", "Sat"],
      ["rest", "Sun"],
    ]);
    expect(board.columns[1]).toMatchObject({ weekday: 2, addLabel: "Add a day on Tuesday" });
    expect(board.columns[6]).toMatchObject({ weekday: 0 });
    expect(dayCards(officeStrength()).map((d) => [d.dayId, d.name])).toEqual([
      ["d-push", "Push"],
      ["d-pull", "Pull"],
    ]);
  });

  it("lists a fixed day's exercises as chips, marking superset members", () => {
    const [push, pull] = dayCards(officeStrength());

    expect(push!.chips).toEqual([
      { name: "Barbell Bench Press", superset: false },
      { name: "Barbell Overhead Press", superset: false },
      { name: "Plank", superset: false },
    ]);
    expect(push!.overflow).toBeNull();
    expect(pull!.chips.map((c) => c.superset)).toEqual([true, true, false]);
  });

  it("caps a card at four chips and counts the rest", () => {
    const program = officeStrength();
    dayOf(program, "d-push").exercises.push(...dayOf(program, "d-pull").exercises);

    const [monday, wednesday] = dayCards(program);

    expect(monday!.chips.map((c) => c.name)).toEqual([
      "Barbell Bench Press",
      "Barbell Overhead Press",
      "Plank",
      "Pull-Up",
    ]);
    expect(monday!.overflow).toBe("+2 more");
    expect(wednesday!.overflow).toBeNull();
  });

  it("marks the day being edited — the first one by default", () => {
    const editing = (plannerDayId: string | null) =>
      dayCards(officeStrength(), plannerDayId)
        .filter((d) => d.selected)
        .map((d) => d.dayId);

    expect(editing(null)).toEqual(["d-push"]);
    expect(editing("d-pull")).toEqual(["d-pull"]);
    expect(editing("deleted-day")).toEqual(["d-push"]);
  });

  it("lays a floating plan out as Day 1..N followed by an add tile", () => {
    const board = vmOf(asFloating(officeStrength()), "d-pull").board;

    expect(board.schedule).toBe("floating");
    expect(board.columns.map((c) => c.kind)).toEqual(["day", "day", "add"]);
    expect(
      dayCards(asFloating(officeStrength()), "d-pull").map((d) => [d.label, d.selected]),
    ).toEqual([
      ["Day 1", false],
      ["Day 2", true],
    ]);
  });

  it("offers only the add tile for an empty floating plan, and seven free weekdays for an empty weekday plan", () => {
    expect(columns({ ...EMPTY_PROGRAM, schedule: "floating" })).toEqual([{ kind: "add" }]);
    expect(columns(EMPTY_PROGRAM).map((c) => c.kind)).toEqual(Array(7).fill("rest"));
  });

  it("shows a cycled day's target muscles as chips", () => {
    const [upper, core] = dayCards(rotationPlan());

    expect(upper!.chips.map((c) => c.name)).toEqual(["Chest", "Lats"]);
    expect(core).toMatchObject({ label: "Thu", name: "Core", chips: [{ name: "Abs" }] });
  });

  it("falls back to the exercise id on a chip when the library no longer has it", () => {
    const program = officeStrength();
    dayOf(program, "d-pull").exercises[2]!.exId = "retired_custom_lift";

    expect(dayCards(program)[1]!.chips.map((c) => c.name)).toEqual([
      "Pull-Up",
      "Cable Lat Pulldown",
      "retired_custom_lift",
    ]);
  });
});
