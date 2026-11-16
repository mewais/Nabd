// Component tests. Mutations are checked by applying the edit the UI emitted to
// a real ProgramEditor (see fixtures) and asserting on the resulting program.

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EMPTY_PROGRAM } from "@nabd/domain";
import type { Program } from "@nabd/domain";
import type { EditRef } from "@nabd/program-editor";
import {
  DayEditor,
  SetTable,
  WeekBoard,
  buildBoard,
  buildEditor,
  buildSetBlock,
} from "@nabd/planner";
import {
  BENCH,
  DB_BENCH,
  OHP,
  PLANK,
  PUSH_UP,
  cycledProgram,
  dayOf,
  editSink,
  fixedProgram,
  floating,
  library,
  renderPlanner,
} from "./fixtures";

const exIds = (program: Program, dayId: string): string[] =>
  dayOf(program, dayId).exercises.map((e) => e.exId);

const button = (name: string | RegExp, index = 0): HTMLElement =>
  screen.getAllByRole("button", { name })[index]!;

/** Render one exercise's set table on its own. */
function renderSetTable(program: Program, dayId: string, ref: EditRef) {
  const day = dayOf(program, dayId);
  const prescription = (ref.kind === "ex" ? day.exercises : day.slots).find(
    (p) => p.id === ref.id,
  )!;
  const sink = editSink(program);
  render(
    <SetTable dayId={dayId} refTarget={ref} block={buildSetBlock(prescription)} cb={sink.cb} />,
  );
  const sets = () => {
    const d = dayOf(sink.program, dayId);
    return (ref.kind === "ex" ? d.exercises : d.slots).find((p) => p.id === ref.id)!;
  };
  return { sink, prescription: sets };
}

/** The grid row of the set whose badge reads `badge`. */
const setRow = (badge: string): HTMLElement =>
  screen.getByRole("button", { name: badge }).parentElement!;

describe("SetTable", () => {
  const BENCH_REF: EditRef = { kind: "ex", id: "e-bench" };

  it("shows a badge per set with its type, and the prescribed reps and RPE", () => {
    renderSetTable(fixedProgram(), "d-push", BENCH_REF);

    expect(screen.getByTitle("Warm-up — click to change")).toHaveTextContent("W");
    expect(screen.getAllByTitle("Working — click to change").map((b) => b.textContent)).toEqual([
      "1",
      "2",
    ]);
    expect(screen.getByTitle("Drop set — click to change")).toHaveTextContent("D");
    expect(setRow("2")).toHaveTextContent("6");
    expect(setRow("2")).toHaveTextContent("8.5");
    expect(screen.getByText("2:30")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add a note/)).toHaveValue("Pause on the chest");
  });

  it("marks the active rep mode and load mode", () => {
    renderSetTable(fixedProgram(), "d-push", { kind: "ex", id: "e-ohp" });

    expect(screen.getByRole("button", { name: "Fixed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Range" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "%1RM" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "None" })).toHaveAttribute("aria-pressed", "false");
  });

  it("offers no intensity stepper when load is off, and seconds for a timed hold", () => {
    renderSetTable(fixedProgram(), "d-push", { kind: "ex", id: "e-plank" });

    // badge, − / + for the seconds, remove
    expect(within(setRow("1")).getAllByRole("button")).toHaveLength(4);
    expect(setRow("1")).toHaveTextContent("45s");
    expect(setRow("2")).toHaveTextContent("60s");
  });

  it("clicking a badge cycles that set's type", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", BENCH_REF);

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(prescription().sets.map((s) => s.type)).toEqual(["warmup", "working", "warmup", "drop"]);
  });

  it.each([
    ["reps +", "+", 0, { a: 9, b: 10, val: 8 }],
    ["reps −", "−", 0, { a: 7, b: 10, val: 8 }],
    ["range top +", "+", 1, { a: 8, b: 11, val: 8 }],
    ["RPE +", "+", 2, { a: 8, b: 10, val: 8.5 }],
    ["range top −", "−", 1, { a: 8, b: 9, val: 8 }],
    ["RPE −", "−", 2, { a: 8, b: 10, val: 7.5 }],
  ])("stepper %s edits only its own value", (_label, glyph, index, expected) => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", BENCH_REF);

    fireEvent.click(within(setRow("1")).getAllByRole("button", { name: glyph })[index]!);

    expect(prescription().sets[1]).toMatchObject(expected);
    expect(prescription().sets[0]).toEqual({ type: "warmup", a: 10, b: 12, val: 6 });
  });

  it("× removes that set", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", BENCH_REF);

    fireEvent.click(within(setRow("1")).getByRole("button", { name: "remove" }));

    expect(prescription().sets.map((s) => [s.type, s.a])).toEqual([
      ["warmup", 10],
      ["working", 6],
      ["drop", 12],
    ]);
  });

  it("+ Add set appends a working set and + Warmup prepends a warm-up", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", { kind: "ex", id: "e-ohp" });

    fireEvent.click(screen.getByRole("button", { name: "+ Add set" }));
    expect(prescription().sets).toHaveLength(4);
    expect(prescription().sets.at(-1)).toEqual({ type: "working", a: 5, val: 75 });

    fireEvent.click(screen.getByRole("button", { name: "+ Warmup" }));
    expect(prescription().sets).toHaveLength(5);
    expect(prescription().sets[0]).toMatchObject({ type: "warmup", a: 5 });
  });

  it("switching REPS to Time drops the range tops", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", BENCH_REF);

    fireEvent.click(screen.getByRole("button", { name: "Time" }));
    expect(prescription().repMode).toBe("time");
    expect(prescription().sets.every((s) => s.b === undefined)).toBe(true);
  });

  it("switching LOAD to %1RM gives every set a percentage, None clears it", () => {
    const plank = renderSetTable(fixedProgram(), "d-push", { kind: "ex", id: "e-plank" });
    fireEvent.click(screen.getByRole("button", { name: "%1RM" }));
    expect(plank.prescription().intensity).toBe("pct");
    expect(plank.prescription().sets.map((s) => s.val)).toEqual([70, 70]);
  });

  it("switching LOAD to None drops the intensity values", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", BENCH_REF);

    fireEvent.click(screen.getByRole("button", { name: "None" }));

    expect(prescription().intensity).toBe("none");
    expect(prescription().sets.every((s) => s.val === undefined)).toBe(true);
  });

  it("the REST stepper moves rest in 15 s steps", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", BENCH_REF);
    const rest = within(screen.getByText("2:30").parentElement!);

    fireEvent.click(rest.getByRole("button", { name: "+" }));
    expect(prescription().rest).toBe(165);

    fireEvent.click(rest.getByRole("button", { name: "−" }));
    fireEvent.click(rest.getByRole("button", { name: "−" }));
    expect(prescription().rest).toBe(135);
  });

  it("typing a note stores it on the prescription", () => {
    const { prescription } = renderSetTable(fixedProgram(), "d-push", { kind: "ex", id: "e-ohp" });

    fireEvent.change(screen.getByPlaceholderText(/Add a note/), {
      target: { value: "Squeeze glutes" },
    });

    expect(prescription().notes).toBe("Squeeze glutes");
  });

  it("edits a cycled slot's prescription when pointed at a slot", () => {
    const { sink, prescription } = renderSetTable(cycledProgram(), "d-upper", {
      kind: "slot",
      id: "s-lats",
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Add set" }));

    expect(prescription().sets).toHaveLength(3);
    expect(dayOf(sink.program, "d-upper").slots[0]!.sets).toHaveLength(3); // chest untouched
  });
});

describe("ProgramHeader (inside the planner)", () => {
  // "Fixed" is also a rep-mode option further down; the header's comes first.
  const programType = (name: "Fixed" | "Cycled"): HTMLElement => button(name, 0);

  it("shows the program name and marks the current type and schedule", () => {
    renderPlanner(fixedProgram());

    expect(screen.getByLabelText("Program name")).toHaveValue("Office Strength");
    expect(programType("Fixed")).toHaveAttribute("aria-pressed", "true");
    expect(programType("Cycled")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Weekdays" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("typing in the name input renames the program", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.change(screen.getByLabelText("Program name"), { target: { value: "Winter Bulk" } });

    expect(planner.program().name).toBe("Winter Bulk");
    expect(planner.program().days).toEqual(fixedProgram().days);
    expect(screen.getByLabelText("Program name")).toHaveValue("Winter Bulk");
  });

  it("switching to Cycled derives one slot per muscle group from each day's exercises", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(programType("Cycled"));

    const program = planner.program();
    expect(program.type).toBe("cycled");
    expect(dayOf(program, "d-push").slots.map((s) => [s.muscle, s.pool])).toEqual([
      ["chest", [BENCH]],
      ["side_delts", [OHP]],
      ["abs", [PLANK]],
    ]);
    expect(dayOf(program, "d-pull").slots).toHaveLength(1);
    expect(dayOf(program, "d-pull").slots[0]!.pool).toHaveLength(3);
    // the editor now shows slots instead of exercises
    expect(screen.getAllByText("EXERCISE POOL · 1 exercises")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "remove exercise" })).not.toBeInTheDocument();
  });

  it("switching to Fixed keeps the slots but shows the exercises again", () => {
    const planner = renderPlanner({ ...fixedProgram(), type: "cycled" });
    expect(screen.getByText("+ ADD MUSCLE")).toBeInTheDocument();

    fireEvent.click(programType("Fixed"));

    expect(planner.program().type).toBe("fixed");
    expect(screen.getAllByRole("button", { name: "remove exercise" })).toHaveLength(3);
  });

  it("switching to Floating turns the week into a numbered day list, and back places days on weekdays", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(screen.getByRole("button", { name: "Floating" }));

    expect(planner.program().schedule).toBe("floating");
    expect(screen.getByText("DAY 1")).toBeInTheDocument();
    expect(screen.getByText("DAY 2")).toBeInTheDocument();
    expect(screen.queryByText("TUE")).not.toBeInTheDocument();
    expect(screen.getByText("Day 1 · floating")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weekdays" }));

    expect(planner.program().schedule).toBe("weekday");
    expect(planner.program().days.map((d) => d.weekday)).toEqual([1, 3]);
    expect(screen.getByText("TUE")).toBeInTheDocument();
  });

  it("gives days without a weekday the first free ones when a floating plan goes weekday", () => {
    const planner = renderPlanner(floating(fixedProgram()));

    fireEvent.click(screen.getByRole("button", { name: "Weekdays" }));

    expect(planner.program().days.map((d) => d.weekday)).toEqual([1, 2]);
  });
});

describe("WeekBoard", () => {
  it("shows a card per training day and a rest column with an add button for the others", () => {
    renderPlanner(fixedProgram());

    for (const label of ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText("Rest")).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "+ Add day" })).toHaveLength(5);
    expect(screen.getByText("Pull")).toBeInTheDocument();
    expect(screen.getByText("Cable Lat Pulldown")).toBeInTheDocument();
  });

  it("+ Add day on a rest column adds a day on that weekday", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(button("+ Add day", 2)); // rest columns: TUE, THU, FRI, SAT, SUN

    const added = planner.program().days.at(-1)!;
    expect(planner.program().days).toHaveLength(3);
    expect(added).toMatchObject({ id: "new-1", name: "New day", weekday: 5, exercises: [] });
    expect(screen.getAllByText("Rest")).toHaveLength(4);
  });

  it("clicking a day card selects it for editing", () => {
    const planner = renderPlanner(fixedProgram());
    expect(screen.getByDisplayValue("Push")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Pull"));

    expect(planner.cb.onSelectDay).toHaveBeenCalledWith("d-pull");
    expect(planner.edits()).toBe(0);
    expect(screen.getByDisplayValue("Pull")).toBeInTheDocument();
    expect(screen.getByText("3 exercises · 5 sets")).toBeInTheDocument();
  });

  it("the add column of a floating plan appends an unscheduled day", () => {
    const planner = renderPlanner(floating(fixedProgram()));

    fireEvent.click(screen.getByText("ADD"));

    expect(planner.program().days.map((d) => [d.name, d.weekday])).toEqual([
      ["Push", null],
      ["Pull", null],
      ["New day", null],
    ]);
    expect(screen.getByText("DAY 3")).toBeInTheDocument();
  });

  it("says how many exercises did not fit on a card", () => {
    const program = fixedProgram();
    dayOf(program, "d-push").exercises.push(...dayOf(program, "d-pull").exercises);
    const sink = editSink(program);

    render(<WeekBoard columns={buildBoard(program, null, library)} cb={sink.cb} />);

    expect(screen.getByText("+2 more")).toBeInTheDocument();
    // Pull still fits entirely: only Monday overflows
    expect(screen.getAllByText(/more$/)).toHaveLength(1);
  });
});

describe("DayEditor — fixed day", () => {
  it("shows the day's name, summary and one card per exercise", () => {
    renderPlanner(fixedProgram());

    expect(screen.getByDisplayValue("Push")).toBeInTheDocument();
    expect(screen.getByText("3 exercises · 9 sets")).toBeInTheDocument();
    expect(screen.getByText("Chest, Front Delts, Triceps")).toBeInTheDocument();
    expect(screen.getByText("BODYWEIGHT")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "+ Add set" })).toHaveLength(3);
  });

  it("+ Add set on the first exercise adds a set to that exercise only", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(button("+ Add set", 0));

    const push = dayOf(planner.program(), "d-push");
    expect(push.exercises.map((e) => e.sets.length)).toEqual([5, 3, 2]);
    expect(screen.getByText("3 exercises · 10 sets")).toBeInTheDocument();
  });

  it("renaming the day updates the program and the board", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.change(screen.getByDisplayValue("Push"), { target: { value: "Push A" } });

    expect(dayOf(planner.program(), "d-push").name).toBe("Push A");
    expect(screen.getByText("Push A")).toBeInTheDocument(); // board card title
  });

  it("a weekday button moves the day there", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(screen.getByTitle("FRI"));

    expect(planner.program().days.map((d) => d.weekday)).toEqual([5, 3]);
  });

  it("moving onto an occupied weekday swaps the two days", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(screen.getByTitle("WED"));

    expect(planner.program().days.map((d) => [d.name, d.weekday])).toEqual([
      ["Push", 3],
      ["Pull", 1],
    ]);
  });

  it("Move later swaps an exercise with the next one, Move earlier brings it back", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(button("Move later", 0));
    expect(exIds(planner.program(), "d-push")).toEqual([OHP, BENCH, PLANK]);

    fireEvent.click(button("Move earlier", 1)); // bench is now second
    expect(exIds(planner.program(), "d-push")).toEqual([BENCH, OHP, PLANK]);
  });

  it("moving the first exercise earlier or the last one later changes nothing", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(button("Move earlier", 0));
    fireEvent.click(button("Move later", 2));

    expect(planner.program()).toEqual(fixedProgram());
  });

  it("× on an exercise removes it from the day", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(button("remove exercise", 1));

    expect(exIds(planner.program(), "d-push")).toEqual([BENCH, PLANK]);
    expect(exIds(planner.program(), "d-pull")).toHaveLength(3);
    expect(screen.queryByText("Barbell Overhead Press")).not.toBeInTheDocument();
  });

  it("+ Add exercise asks the app to open the library for this day", () => {
    const planner = renderPlanner(fixedProgram(), { editDayId: "d-pull" });

    fireEvent.click(screen.getByRole("button", { name: "+ Add exercise" }));

    expect(planner.cb.onAddExercise).toHaveBeenCalledWith("d-pull");
    expect(planner.edits()).toBe(0);
  });

  it("Delete day removes the day; deleting the last one leaves just the header and board", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    expect(planner.program().days.map((d) => d.id)).toEqual(["d-pull"]);
    expect(screen.getByDisplayValue("Pull")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    expect(planner.program().days).toEqual([]);
    expect(screen.queryByRole("button", { name: "Delete day" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Program name")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "+ Add day" })).toHaveLength(7);
  });

  it("renders no editor for an empty program", () => {
    renderPlanner(EMPTY_PROGRAM);

    expect(screen.getByLabelText("Program name")).toHaveValue("My Plan");
    expect(screen.queryByText("Weekly coverage")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete day" })).not.toBeInTheDocument();
  });
});

describe("DayEditor — supersets", () => {
  it("groups linked exercises under a SUPERSET heading with A1/A2 tags", () => {
    renderPlanner(fixedProgram(), { editDayId: "d-pull" });

    expect(screen.getByText("SUPERSET")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "toggle superset" }).map((b) => b.textContent),
    ).toEqual(["Unlink", "Unlink", "⛓ Superset ↓"]);
  });

  it("⛓ Superset links an exercise with the one below it", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(button("toggle superset", 0));

    const [bench, ohp, plank] = dayOf(planner.program(), "d-push").exercises;
    expect(bench!.supersetId).toBeDefined();
    expect(ohp!.supersetId).toBe(bench!.supersetId);
    expect(plank!.supersetId).toBeUndefined();
    expect(screen.getByText("SUPERSET")).toBeInTheDocument();
  });

  it("Unlink on the first member dissolves the superset", () => {
    const planner = renderPlanner(fixedProgram(), { editDayId: "d-pull" });

    fireEvent.click(screen.getAllByRole("button", { name: "toggle superset" })[0]!);

    expect(dayOf(planner.program(), "d-pull").exercises.map((e) => e.supersetId)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(screen.queryByText("SUPERSET")).not.toBeInTheDocument();
  });

  it("Unlink on the last member dissolves the superset too", () => {
    const planner = renderPlanner(fixedProgram(), { editDayId: "d-pull" });

    fireEvent.click(screen.getAllByRole("button", { name: "toggle superset" })[1]!);

    expect(dayOf(planner.program(), "d-pull").exercises.map((e) => e.supersetId)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe("DayEditor — floating schedule", () => {
  it("shows the day's position instead of the weekday picker", () => {
    renderPlanner(floating(fixedProgram()), { editDayId: "d-pull" });

    expect(screen.getByText("Day 2 · floating")).toBeInTheDocument();
    expect(screen.queryByTitle("FRI")).not.toBeInTheDocument();
  });

  it("the day's Move later / Move earlier arrows reorder the days", () => {
    const planner = renderPlanner(floating(fixedProgram()), { editDayId: "d-push" });
    const dayArrows = () => within(screen.getByText(/· floating$/).parentElement!);

    fireEvent.click(dayArrows().getByRole("button", { name: "Move later" }));

    expect(planner.program().days.map((d) => d.id)).toEqual(["d-pull", "d-push"]);
    expect(screen.getByText("Day 2 · floating")).toBeInTheDocument();
    expect(exIds(planner.program(), "d-push")).toEqual([BENCH, OHP, PLANK]); // exercises untouched

    fireEvent.click(dayArrows().getByRole("button", { name: "Move earlier" }));

    expect(planner.program().days.map((d) => d.id)).toEqual(["d-push", "d-pull"]);
  });
});

describe("DayEditor — cycled day", () => {
  it("shows each slot's target muscle and pool, and muscle chips instead of + Add exercise", () => {
    const program = cycledProgram();
    const sink = editSink(program);
    render(
      <DayEditor
        editor={buildEditor(program, "d-upper", library)!}
        muscles={["calves", "neck"]}
        cb={sink.cb}
      />,
    );

    expect(screen.getByText("2 muscles · 5 sets")).toBeInTheDocument();
    expect(screen.getByText("Targets Chest · cycles its pool")).toBeInTheDocument();
    expect(screen.getByText("EXERCISE POOL · 3 exercises")).toBeInTheDocument();
    expect(screen.getByText("EXERCISE POOL · 2 exercises")).toBeInTheDocument();
    expect(screen.getByText("Dumbbell Bench Press")).toBeInTheDocument();
    expect(screen.getByText("+ ADD MUSCLE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calves" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neck" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "toggle superset" })).not.toBeInTheDocument();
  });

  it("a muscle chip adds a slot for that muscle with an empty pool", () => {
    const planner = renderPlanner(cycledProgram());

    fireEvent.click(screen.getByRole("button", { name: "Calves" }));

    const slots = dayOf(planner.program(), "d-upper").slots;
    expect(slots.map((s) => s.muscle)).toEqual(["chest", "lats", "calves"]);
    expect(slots[2]).toMatchObject({ id: "new-1", pool: [] });
    expect(slots[2]!.sets.length).toBeGreaterThan(0);
    expect(screen.getByText("EXERCISE POOL · 0 exercises")).toBeInTheDocument();
  });

  it("× on a pool entry removes that exercise from that slot's pool", () => {
    const planner = renderPlanner(cycledProgram());

    fireEvent.click(button("remove from pool", 1)); // Dumbbell Bench Press

    const [chest, lats] = dayOf(planner.program(), "d-upper").slots;
    expect(chest!.pool).toEqual([BENCH, PUSH_UP]);
    expect(lats!.pool).toHaveLength(2);
    expect(chest!.pool).not.toContain(DB_BENCH);
  });

  it("+ Add exercise in a slot asks the app to open the library for that slot", () => {
    const planner = renderPlanner(cycledProgram());

    fireEvent.click(button("+ Add exercise", 1));

    expect(planner.cb.onAddPool).toHaveBeenCalledWith("d-upper", "s-lats");
    expect(planner.cb.onAddExercise).not.toHaveBeenCalled();
    expect(planner.edits()).toBe(0);
  });

  it("Move later swaps a slot with the next one", () => {
    const planner = renderPlanner(cycledProgram());

    fireEvent.click(button("Move later", 0));

    expect(dayOf(planner.program(), "d-upper").slots.map((s) => s.id)).toEqual([
      "s-lats",
      "s-chest",
    ]);
  });

  it("× on a slot removes it", () => {
    const planner = renderPlanner(cycledProgram());

    fireEvent.click(button("remove slot", 0));

    expect(dayOf(planner.program(), "d-upper").slots.map((s) => s.id)).toEqual(["s-lats"]);
    expect(dayOf(planner.program(), "d-core").slots).toHaveLength(1);
  });
});

describe("PlannerScreen — coverage rail", () => {
  it("lists the planned volume per muscle next to the editor", () => {
    renderPlanner(fixedProgram(), {
      volumeBars: [
        { muscle: "chest", name: "Chest", sets: 3, pct: 100 },
        { muscle: "lats", name: "Lats", sets: 2.5, pct: 83 },
      ],
    });

    expect(screen.getByText("Weekly coverage")).toBeInTheDocument();
    expect(screen.getByText("3 sets")).toBeInTheDocument();
    expect(screen.getByText("2.5 sets")).toBeInTheDocument();
    expect(screen.getByText("Lats")).toBeInTheDocument();
  });
});
