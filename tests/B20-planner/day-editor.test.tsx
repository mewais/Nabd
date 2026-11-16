// The day editor: a fixed day's exercises and supersets, a cycled day's slots,
// and where the day sits in the plan.

import { fireEvent, screen, within } from "@testing-library/react";
import type { Program } from "@nabd/domain";
import {
  BENCH,
  DB_BENCH,
  OHP,
  PLANK,
  PUSH_UP,
  cycledProgram,
  dayOf,
  fixedProgram,
  floating,
} from "./fixtures";
import { button, card, renderPlanner } from "./render";

const exIds = (program: Program, dayId: string): string[] =>
  dayOf(program, dayId).exercises.map((e) => e.exId);

const supersetIds = (program: Program, dayId: string): (string | undefined)[] =>
  dayOf(program, dayId).exercises.map((e) => e.supersetId);

const press = (scope: ReturnType<typeof card>, name: string | RegExp): void => {
  fireEvent.click(scope.getByRole("button", { name }));
};

describe("DayEditor — fixed day", () => {
  it("shows the day's name, summary and one card per exercise", () => {
    renderPlanner(fixedProgram());

    expect(screen.getByLabelText("Day name")).toHaveValue("Push");
    expect(screen.getByText("3 exercises · 9 sets")).toBeInTheDocument();
    expect(
      card("Barbell Bench Press").getByText("Chest, Front Delts, Triceps"),
    ).toBeInTheDocument();
    expect(card("Plank").getByText("BODYWEIGHT")).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(3);
  });

  it("renaming the day updates the program and the board", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.change(screen.getByLabelText("Day name"), { target: { value: "Push A" } });

    expect(dayOf(planner.program(), "d-push").name).toBe("Push A");
    expect(screen.getByText("Push A")).toBeInTheDocument();
  });

  it("marks the day's weekday, and another weekday moves the day there", () => {
    const planner = renderPlanner(fixedProgram());
    const weekday = (name: string) =>
      within(screen.getByRole("group", { name: "Weekday" })).getByRole("button", { name });
    expect(weekday("Monday")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(weekday("Friday"));

    expect(planner.program().days.map((d) => d.weekday)).toEqual([5, 3]);
    expect(weekday("Friday")).toHaveAttribute("aria-pressed", "true");
  });

  it("moving onto an occupied weekday swaps the two days", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));

    expect(planner.program().days.map((d) => [d.name, d.weekday])).toEqual([
      ["Push", 3],
      ["Pull", 1],
    ]);
  });

  it("Move later swaps an exercise with the next one, Move earlier brings it back", () => {
    const planner = renderPlanner(fixedProgram());

    press(card("Barbell Bench Press"), "Move later");
    expect(exIds(planner.program(), "d-push")).toEqual([OHP, BENCH, PLANK]);

    press(card("Barbell Bench Press"), "Move earlier");
    expect(exIds(planner.program(), "d-push")).toEqual([BENCH, OHP, PLANK]);
  });

  it("moving the first exercise earlier or the last one later changes nothing", () => {
    const planner = renderPlanner(fixedProgram());

    press(card("Barbell Bench Press"), "Move earlier");
    press(card("Plank"), "Move later");

    expect(planner.program()).toEqual(fixedProgram());
  });

  it("× on an exercise removes it from the day", () => {
    const planner = renderPlanner(fixedProgram());

    press(card("Barbell Overhead Press"), "Remove exercise");

    expect(exIds(planner.program(), "d-push")).toEqual([BENCH, PLANK]);
    expect(exIds(planner.program(), "d-pull")).toHaveLength(3);
    expect(screen.queryByText("Barbell Overhead Press")).toBeNull();
  });

  it("+ Add exercise asks the app to open the library for this day", () => {
    const planner = renderPlanner(fixedProgram(), "d-pull");

    fireEvent.click(screen.getByRole("button", { name: "+ Add exercise" }));

    expect(planner.onAddExercise).toHaveBeenCalledWith("d-pull");
    expect(planner.program()).toEqual(fixedProgram());
  });

  it("Delete day removes the day; deleting the last one leaves just the header and board", () => {
    const planner = renderPlanner(fixedProgram());

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    expect(planner.program().days.map((d) => d.id)).toEqual(["d-pull"]);
    expect(screen.getByLabelText("Day name")).toHaveValue("Pull");

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    expect(planner.program().days).toEqual([]);
    expect(screen.queryByLabelText("Day name")).toBeNull();
    expect(screen.getByLabelText("Program name")).toBeInTheDocument();
  });
});

describe("DayEditor — supersets", () => {
  it("frames linked exercises under a Superset heading with A1/A2 tags", () => {
    renderPlanner(fixedProgram(), "d-pull");

    expect(screen.getByText("Superset")).toBeInTheDocument();
    expect(card("Pull-Up").getByText("A1")).toBeInTheDocument();
    expect(card("Cable Lat Pulldown").getByText("A2")).toBeInTheDocument();
    expect(card("Pull-Up").getByRole("button", { name: "Unlink" })).toBeInTheDocument();
    expect(
      card("Barbell Deadlift").getByRole("button", { name: "Superset ↓" }),
    ).toBeInTheDocument();
  });

  it("Superset ↓ links an exercise with the one below it", () => {
    const planner = renderPlanner(fixedProgram());

    press(card("Barbell Bench Press"), "Superset ↓");

    const [bench, ohp, plank] = supersetIds(planner.program(), "d-push");
    expect(bench).toBeDefined();
    expect(ohp).toBe(bench);
    expect(plank).toBeUndefined();
    expect(screen.getByText("Superset")).toBeInTheDocument();
  });

  it.each(["Pull-Up", "Cable Lat Pulldown"])("Unlink on %s dissolves the superset", (member) => {
    const planner = renderPlanner(fixedProgram(), "d-pull");

    press(card(member), "Unlink");

    expect(supersetIds(planner.program(), "d-pull")).toEqual([undefined, undefined, undefined]);
    expect(screen.queryByText("Superset")).toBeNull();
  });
});

describe("DayEditor — floating schedule", () => {
  it("shows the day's position instead of the weekday picker", () => {
    renderPlanner(floating(fixedProgram()), "d-pull");

    expect(screen.getByText("Day 2 · floating")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Weekday" })).toBeNull();
  });

  it("the day's own arrows reorder the days, leaving its exercises alone", () => {
    const planner = renderPlanner(floating(fixedProgram()), "d-push");

    fireEvent.click(button("Move later", 0));

    expect(planner.program().days.map((d) => d.id)).toEqual(["d-pull", "d-push"]);
    expect(screen.getByText("Day 2 · floating")).toBeInTheDocument();
    expect(exIds(planner.program(), "d-push")).toEqual([BENCH, OHP, PLANK]);

    fireEvent.click(button("Move earlier", 0));

    expect(planner.program().days.map((d) => d.id)).toEqual(["d-push", "d-pull"]);
  });
});

describe("DayEditor — cycled day", () => {
  it("shows each slot's target muscle and pool, and a muscle picker instead of + Add exercise for the day", () => {
    renderPlanner(cycledProgram());

    expect(screen.getByText("2 muscles · 5 sets")).toBeInTheDocument();
    expect(card("Chest").getByText("Targets Chest · cycles its pool")).toBeInTheDocument();
    expect(card("Chest").getByText("Exercise pool · 3 exercises")).toBeInTheDocument();
    expect(card("Chest").getByText("Dumbbell Bench Press")).toBeInTheDocument();
    expect(card("Lats").getByText("Exercise pool · 2 exercises")).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Add muscle" })).getAllByRole("button"),
    ).toHaveLength(23);
    expect(screen.queryByRole("button", { name: "Unlink" })).toBeNull();
  });

  it("picking a muscle adds a slot for it with an empty pool", () => {
    const planner = renderPlanner(cycledProgram());

    fireEvent.click(screen.getByRole("button", { name: "Calves" }));

    const slots = dayOf(planner.program(), "d-upper").slots;
    expect(slots.map((s) => s.muscle)).toEqual(["chest", "lats", "calves"]);
    expect(slots[2]).toMatchObject({ id: "new-1", pool: [] });
    expect(slots[2]!.sets.length).toBeGreaterThan(0);
    expect(card("Calves").getByText("Exercise pool · 0 exercises")).toBeInTheDocument();
  });

  it("× on a pool entry removes that exercise from that slot's pool", () => {
    const planner = renderPlanner(cycledProgram());

    press(card("Chest"), "Remove Dumbbell Bench Press from pool");

    const [chest, lats] = dayOf(planner.program(), "d-upper").slots;
    expect(chest!.pool).toEqual([BENCH, PUSH_UP]);
    expect(chest!.pool).not.toContain(DB_BENCH);
    expect(lats!.pool).toHaveLength(2);
  });

  it("+ Add exercise in a slot asks the app to open the library for that slot and muscle", () => {
    const planner = renderPlanner(cycledProgram());

    press(card("Lats"), "+ Add exercise");

    expect(planner.onAddToPool).toHaveBeenCalledWith("d-upper", "s-lats", "lats");
    expect(planner.onAddExercise).not.toHaveBeenCalled();
    expect(planner.program()).toEqual(cycledProgram());
  });

  it("Move later swaps a slot with the next one", () => {
    const planner = renderPlanner(cycledProgram());

    press(card("Chest"), "Move later");

    expect(dayOf(planner.program(), "d-upper").slots.map((s) => s.id)).toEqual([
      "s-lats",
      "s-chest",
    ]);
  });

  it("× on a slot removes it", () => {
    const planner = renderPlanner(cycledProgram());

    press(card("Chest"), "Remove slot");

    expect(dayOf(planner.program(), "d-upper").slots.map((s) => s.id)).toEqual(["s-lats"]);
    expect(dayOf(planner.program(), "d-core").slots).toHaveLength(1);
  });
});

describe("CoverageRail", () => {
  it("lists the planned sets per muscle as meters next to the editor", () => {
    renderPlanner(fixedProgram());

    expect(screen.getByText("Weekly coverage")).toBeInTheDocument();
    const chest = screen.getByRole("meter", { name: "Chest" });
    expect(chest).toHaveAttribute("aria-valuetext", "3 sets");
    expect(chest).toHaveAttribute("aria-valuenow", "19");
    expect(screen.getByRole("meter", { name: "Lats" })).toBeInTheDocument();
  });
});
