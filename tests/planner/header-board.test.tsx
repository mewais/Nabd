// The program header and the week board.

import { fireEvent, screen } from "@testing-library/react";
import { EMPTY_PROGRAM } from "@nabd/domain";
import type { Program } from "@nabd/domain";
import { CATALOG } from "../support/exercises";
import { asFloating, officeStrength } from "../support/programs";
import { dayOf } from "./fixtures";
import { button, renderPlanner } from "./render";

const pressed = (name: string): string | null =>
  screen.getByRole("button", { name }).getAttribute("aria-pressed");

/** The header's plan-type button ("Fixed" is also a rep mode further down the screen). */
const planType = (name: "Fixed" | "Cycled"): HTMLElement => button(name, 0);

describe("ProgramHeader", () => {
  it("shows the program name and marks the current type and schedule", () => {
    renderPlanner(officeStrength());

    expect(screen.getByLabelText("Program name")).toHaveValue("Office Strength");
    expect(planType("Fixed")).toHaveAttribute("aria-pressed", "true");
    expect(planType("Cycled")).toHaveAttribute("aria-pressed", "false");
    expect(pressed("Weekdays")).toBe("true");
    expect(pressed("Floating")).toBe("false");
  });

  it("typing in the name renames the program", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.change(screen.getByLabelText("Program name"), { target: { value: "Winter Bulk" } });

    expect(planner.program().name).toBe("Winter Bulk");
    expect(planner.program().days).toEqual(officeStrength().days);
    expect(screen.getByLabelText("Program name")).toHaveValue("Winter Bulk");
  });

  it("switching to Cycled derives one slot per muscle group and shows slots instead of exercises", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.click(planType("Cycled"));

    expect(planner.program().type).toBe("cycled");
    expect(dayOf(planner.program(), "d-push").slots.map((s) => [s.muscle, s.pool])).toEqual([
      ["chest", [CATALOG.bench]],
      ["side_delts", [CATALOG.overheadPress]],
      ["abs", [CATALOG.plank]],
    ]);
    expect(screen.getAllByText("Exercise pool · 1 exercise")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Remove exercise" })).toBeNull();
  });

  it("switching back to Fixed shows the exercises again", () => {
    const planner = renderPlanner({ ...officeStrength(), type: "cycled" });
    expect(screen.getByRole("group", { name: "Add muscle" })).toBeInTheDocument();

    fireEvent.click(planType("Fixed"));

    expect(planner.program().type).toBe("fixed");
    expect(screen.getAllByRole("button", { name: "Remove exercise" })).toHaveLength(3);
  });

  it("switching to Floating turns the week into a numbered list, and back pins the days from today on", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.click(screen.getByRole("button", { name: "Floating" }));

    expect(planner.program().schedule).toBe("floating");
    expect(screen.getByText("Day 2")).toBeInTheDocument();
    expect(screen.queryByText("Tue")).toBeNull();
    expect(screen.getByText("Day 1 · floating")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weekdays" }));

    // It is Monday and the plan is on its first day: Push is Monday's, Pull Tuesday's.
    expect(planner.program().days.map((d) => d.weekday)).toEqual([1, 2]);
    expect(screen.getByText("Wed")).toBeInTheDocument();
  });

  it("does not offer Weekdays to a floating plan with more days than a week", () => {
    const eightDays: Program = asFloating({
      ...officeStrength(),
      days: [...Array(8).keys()].map((i) => ({
        id: `d-${i}`,
        name: `Session ${i + 1}`,
        weekday: null,
        exercises: [],
        slots: [],
      })),
    });
    const planner = renderPlanner(eightDays);
    const weekdays = screen.getByRole("button", { name: "Weekdays" });

    expect(weekdays).toBeDisabled();
    expect(weekdays).toHaveAttribute("title", "A week has room for 7 days; this plan has 8");

    fireEvent.click(weekdays);
    expect(planner.program()).toEqual(eightDays);
  });
});

describe("WeekBoard", () => {
  it("shows a card per training day and a free weekday with an add button for the others", () => {
    renderPlanner(officeStrength());

    for (const label of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("button", { name: /^Add a day on/ })).toHaveLength(5);
    expect(screen.getByText("Cable Lat Pulldown")).toBeInTheDocument();
  });

  it("adding a day on a free weekday puts a new day there", () => {
    const planner = renderPlanner(officeStrength());

    fireEvent.click(screen.getByRole("button", { name: "Add a day on Friday" }));

    expect(planner.program().days).toHaveLength(3);
    expect(planner.program().days.at(-1)).toMatchObject({
      id: "new-1",
      name: "New day",
      weekday: 5,
      exercises: [],
    });
    expect(screen.getAllByRole("button", { name: /^Add a day on/ })).toHaveLength(4);
  });

  it("a full week offers no further day", () => {
    const planner = renderPlanner(officeStrength());
    for (const weekday of ["Tuesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      fireEvent.click(screen.getByRole("button", { name: `Add a day on ${weekday}` }));
    }

    expect(planner.program().days).toHaveLength(7);
    expect(screen.queryByRole("button", { name: /^Add a day/ })).toBeNull();
  });

  it("marks the edited day's card, and clicking another card selects that day", () => {
    const planner = renderPlanner(officeStrength());
    const cardOf = (dayName: string) => screen.getByText(dayName).closest("button");
    expect(cardOf("Push")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByText("Pull"));

    expect(planner.selectDay).toHaveBeenCalledWith("d-pull");
    expect(planner.program()).toEqual(officeStrength());
    expect(cardOf("Pull")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Day name")).toHaveValue("Pull");
    expect(screen.getByText("3 exercises · 5 sets")).toBeInTheDocument();
  });

  it("the add tile of a floating plan appends an unscheduled day", () => {
    const planner = renderPlanner(asFloating(officeStrength()));

    fireEvent.click(screen.getByRole("button", { name: "Add day" }));

    expect(planner.program().days.map((d) => [d.name, d.weekday])).toEqual([
      ["Push", null],
      ["Pull", null],
      ["New day", null],
    ]);
    expect(screen.getByText("Day 3")).toBeInTheDocument();
  });

  it("says how many exercises did not fit on a card", () => {
    const program = officeStrength();
    dayOf(program, "d-push").exercises.push(...dayOf(program, "d-pull").exercises);

    renderPlanner(program);

    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(screen.getAllByText(/more$/)).toHaveLength(1);
  });

  it("an empty program shows the header and the board, and no editor or coverage", () => {
    renderPlanner(EMPTY_PROGRAM);

    expect(screen.getByLabelText("Program name")).toHaveValue("My Plan");
    expect(screen.getAllByRole("button", { name: /^Add a day on/ })).toHaveLength(7);
    expect(screen.queryByText("Weekly coverage")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete day" })).toBeNull();
  });
});
