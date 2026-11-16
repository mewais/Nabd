// The day editor: a fixed day's exercises and supersets, a cycled day's slots,
// and where the day sits in the plan.

import { fireEvent, screen, within } from "@testing-library/react";
import type { Program } from "@nabd/domain";
import { CATALOG } from "../support/exercises";
import { asFloating, officeStrength, rotationPlan } from "../support/programs";
import { dayOf } from "./fixtures";
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
    renderPlanner(officeStrength());

    expect(screen.getByLabelText("Day name")).toHaveValue("Push");
    expect(screen.getByText("3 exercises · 9 sets")).toBeInTheDocument();
    expect(
      card("Barbell Bench Press").getByText("Chest, Front Delts, Triceps"),
    ).toBeInTheDocument();
    expect(card("Plank").getByText("BODYWEIGHT")).toBeInTheDocument();
    const editor = within(screen.getByRole("region", { name: "Day editor" }));
    expect(editor.getAllByRole("region")).toHaveLength(3);
  });

  it("renaming the day updates the program and the board", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.change(screen.getByLabelText("Day name"), { target: { value: "Push A" } });

    expect(dayOf(planner.program(), "d-push").name).toBe("Push A");
    expect(screen.getByText("Push A")).toBeInTheDocument();
  });

  it("marks the day's weekday, and another weekday moves the day there", () => {
    const planner = renderPlanner(officeStrength());
    const weekday = (name: string) =>
      within(screen.getByRole("group", { name: "Weekday" })).getByRole("button", { name });
    expect(weekday("Monday")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(weekday("Friday"));

    expect(planner.program().days.map((d) => d.weekday)).toEqual([5, 3]);
    expect(weekday("Friday")).toHaveAttribute("aria-pressed", "true");
  });

  it("moving onto an occupied weekday swaps the two days", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));

    expect(planner.program().days.map((d) => [d.name, d.weekday])).toEqual([
      ["Push", 3],
      ["Pull", 1],
    ]);
  });

  it("Move later swaps an exercise with the next one, Move earlier brings it back", () => {
    const planner = renderPlanner(officeStrength());

    press(card("Barbell Bench Press"), "Move later");
    expect(exIds(planner.program(), "d-push")).toEqual([
      CATALOG.overheadPress,
      CATALOG.bench,
      CATALOG.plank,
    ]);

    press(card("Barbell Bench Press"), "Move earlier");
    expect(exIds(planner.program(), "d-push")).toEqual([
      CATALOG.bench,
      CATALOG.overheadPress,
      CATALOG.plank,
    ]);
  });

  it("moving the first exercise earlier or the last one later changes nothing", () => {
    const planner = renderPlanner(officeStrength());

    press(card("Barbell Bench Press"), "Move earlier");
    press(card("Plank"), "Move later");

    expect(planner.program()).toEqual(officeStrength());
  });

  it("× on an exercise removes it from the day", () => {
    const planner = renderPlanner(officeStrength());

    press(card("Barbell Overhead Press"), "Remove exercise");

    expect(exIds(planner.program(), "d-push")).toEqual([CATALOG.bench, CATALOG.plank]);
    expect(exIds(planner.program(), "d-pull")).toHaveLength(3);
    expect(screen.queryByText("Barbell Overhead Press")).toBeNull();
  });

  it("+ Add exercise asks the app to open the library for this day", () => {
    const planner = renderPlanner(officeStrength(), "d-pull");

    fireEvent.click(screen.getByRole("button", { name: "+ Add exercise" }));

    expect(planner.addExercise).toHaveBeenCalledWith("d-pull");
    expect(planner.program()).toEqual(officeStrength());
  });

  it("Delete day asks the app to delete it — which confirms first — and removes nothing itself", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    expect(planner.removeDay).toHaveBeenCalledWith("d-push");
    expect(planner.program()).toEqual(officeStrength());
    expect(screen.getByLabelText("Day name")).toHaveValue("Push");
  });
});

describe("DayEditor — supersets", () => {
  it("frames linked exercises under a Superset heading with A1/A2 tags", () => {
    renderPlanner(officeStrength(), "d-pull");

    expect(screen.getByText("Superset")).toBeInTheDocument();
    expect(card("Pull-Up").getByText("A1")).toBeInTheDocument();
    expect(card("Cable Lat Pulldown").getByText("A2")).toBeInTheDocument();
    expect(card("Pull-Up").getByRole("button", { name: "Unlink" })).toBeInTheDocument();
    expect(
      card("Barbell Deadlift").getByRole("button", { name: "Superset ↓" }),
    ).toBeInTheDocument();
  });

  it("Superset ↓ links an exercise with the one below it", () => {
    const planner = renderPlanner(officeStrength());

    press(card("Barbell Bench Press"), "Superset ↓");

    const [bench, ohp, plank] = supersetIds(planner.program(), "d-push");
    expect(bench).toBeDefined();
    expect(ohp).toBe(bench);
    expect(plank).toBeUndefined();
    expect(screen.getByText("Superset")).toBeInTheDocument();
  });

  it.each(["Pull-Up", "Cable Lat Pulldown"])("Unlink on %s dissolves the superset", (member) => {
    const planner = renderPlanner(officeStrength(), "d-pull");

    press(card(member), "Unlink");

    expect(supersetIds(planner.program(), "d-pull")).toEqual([undefined, undefined, undefined]);
    expect(screen.queryByText("Superset")).toBeNull();
  });
});

describe("DayEditor — floating schedule", () => {
  it("shows the day's position instead of the weekday picker", () => {
    renderPlanner(asFloating(officeStrength()), "d-pull");

    expect(screen.getByText("Day 2 · floating")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Weekday" })).toBeNull();
  });

  it("the day's own arrows reorder the days, leaving its exercises alone", () => {
    const planner = renderPlanner(asFloating(officeStrength()), "d-push");

    fireEvent.click(button("Move later", 0));

    expect(planner.program().days.map((d) => d.id)).toEqual(["d-pull", "d-push"]);
    expect(screen.getByText("Day 2 · floating")).toBeInTheDocument();
    expect(exIds(planner.program(), "d-push")).toEqual([
      CATALOG.bench,
      CATALOG.overheadPress,
      CATALOG.plank,
    ]);

    fireEvent.click(button("Move earlier", 0));

    expect(planner.program().days.map((d) => d.id)).toEqual(["d-push", "d-pull"]);
  });
});

describe("DayEditor — cycled day", () => {
  it("shows each slot's target muscle and pool, and a muscle picker instead of + Add exercise for the day", () => {
    renderPlanner(rotationPlan());

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
    const planner = renderPlanner(rotationPlan());

    fireEvent.click(screen.getByRole("button", { name: "Calves" }));

    const slots = dayOf(planner.program(), "d-upper").slots;
    expect(slots.map((s) => s.muscle)).toEqual(["chest", "lats", "calves"]);
    expect(slots[2]).toMatchObject({ id: "new-1", pool: [] });
    expect(slots[2]!.sets.length).toBeGreaterThan(0);
    expect(card("Calves").getByText("Exercise pool · 0 exercises")).toBeInTheDocument();
  });

  it("× on a pool entry removes that exercise from that slot's pool", () => {
    const planner = renderPlanner(rotationPlan());

    press(card("Chest"), "Remove Dumbbell Bench Press from pool");

    const [chest, lats] = dayOf(planner.program(), "d-upper").slots;
    expect(chest!.pool).toEqual([CATALOG.bench, CATALOG.pushUp]);
    expect(chest!.pool).not.toContain(CATALOG.dumbbellBench);
    expect(lats!.pool).toHaveLength(2);
  });

  it("+ Add exercise in a slot asks the app to open the library for that slot and muscle", () => {
    const planner = renderPlanner(rotationPlan());

    press(card("Lats"), "+ Add exercise");

    expect(planner.addPoolExercise).toHaveBeenCalledWith("d-upper", "s-lats", "lats");
    expect(planner.addExercise).not.toHaveBeenCalled();
    expect(planner.program()).toEqual(rotationPlan());
  });

  it("Move later swaps a slot with the next one", () => {
    const planner = renderPlanner(rotationPlan());

    press(card("Chest"), "Move later");

    expect(dayOf(planner.program(), "d-upper").slots.map((s) => s.id)).toEqual([
      "s-lats",
      "s-chest",
    ]);
  });

  it("× on a slot removes it", () => {
    const planner = renderPlanner(rotationPlan());

    press(card("Chest"), "Remove slot");

    expect(dayOf(planner.program(), "d-upper").slots.map((s) => s.id)).toEqual(["s-lats"]);
    expect(dayOf(planner.program(), "d-core").slots).toHaveLength(1);
  });
});

describe("CoverageRail", () => {
  it("lists the planned sets per muscle as meters next to the editor", () => {
    renderPlanner(officeStrength());

    expect(screen.getByText("Weekly coverage")).toBeInTheDocument();
    const chest = screen.getByRole("meter", { name: "Chest" });
    expect(chest).toHaveAttribute("aria-valuetext", "3 sets");
    expect(chest).toHaveAttribute("aria-valuenow", "19");
    expect(screen.getByRole("meter", { name: "Lats" })).toBeInTheDocument();
  });
});
