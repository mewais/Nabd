// The set table of one exercise (or slot), driven through the planner.

import { fireEvent } from "@testing-library/react";
import { officeStrength, rotationPlan } from "../support/programs";
import { dayOf } from "./fixtures";
import { card, renderPlanner, stepper } from "./render";

const BENCH_CARD = "Barbell Bench Press";
const OHP_CARD = "Barbell Overhead Press";
const PLANK_CARD = "Plank";
/** The row of the Push day behind each card. */
const ROW_OF: Record<string, string> = {
  [BENCH_CARD]: "e-bench",
  [OHP_CARD]: "e-ohp",
  [PLANK_CARD]: "e-plank",
};

const press = (scope: ReturnType<typeof card>, name: string | RegExp): void => {
  fireEvent.click(scope.getByRole("button", { name }));
};

/** Pick one of a card's options: a rep mode or a load mode. */
const choose = (scope: ReturnType<typeof card>, name: string): void => {
  fireEvent.click(scope.getByRole("radio", { name }));
};

/** The planner on Monday's "Push" day. */
const renderPush = () => renderPlanner(officeStrength());

describe("SetTable", () => {
  it("shows a badge per set with its type, and the prescribed reps, load, rest and note", () => {
    renderPush();
    const bench = card(BENCH_CARD);

    expect(bench.getByTitle("Warm-up — click to change")).toHaveTextContent("W");
    expect(bench.getAllByTitle("Working set — click to change").map((b) => b.textContent)).toEqual([
      "1",
      "2",
    ]);
    expect(bench.getByTitle("Drop set — click to change")).toHaveTextContent("D");
    expect(stepper(bench, "Set 3 reps").getByText("6")).toBeInTheDocument();
    expect(stepper(bench, "Set 3 top of range").getByText("8")).toBeInTheDocument();
    expect(stepper(bench, "Set 3 RPE").getByText("8.5")).toBeInTheDocument();
    expect(stepper(bench, "Rest").getByText("2:30")).toBeInTheDocument();
    expect(bench.getByRole("textbox", { name: "Note" })).toHaveValue("Pause on the chest");
  });

  it("marks the active rep mode and load mode", () => {
    renderPush();
    const ohp = card(OHP_CARD);

    expect(ohp.getByRole("radio", { name: "Fixed" })).toBeChecked();
    expect(ohp.getByRole("radio", { name: "Range" })).not.toBeChecked();
    expect(ohp.getByRole("radio", { name: "%1RM" })).toBeChecked();
    expect(ohp.getByRole("radio", { name: "None" })).not.toBeChecked();
  });

  it("offers no load stepper when load is off, and seconds for a timed hold", () => {
    renderPush();
    const plank = card(PLANK_CARD);

    expect(stepper(plank, "Set 1 seconds").getByText("45s")).toBeInTheDocument();
    expect(stepper(plank, "Set 2 seconds").getByText("60s")).toBeInTheDocument();
    expect(plank.queryByRole("group", { name: /^Set 1 (RPE|%1RM|load)$/ })).toBeNull();
    expect(plank.queryByRole("group", { name: "Set 1 top of range" })).toBeNull();
  });

  it("seconds or reps is the exercise's doing: only how reps are written can be chosen", () => {
    renderPush();

    const repModes = (name: string) =>
      card(name)
        .queryByRole("radiogroup", { name: "Rep mode" })
        ?.textContent?.match(/Range|Fixed|Time/g);
    expect(repModes(BENCH_CARD)).toEqual(["Range", "Fixed"]);
    // A hold is written one way, so there is nothing to choose.
    expect(repModes(PLANK_CARD)).toBeUndefined();
  });

  // What each control does to a prescription is PrescriptionEditor's (its own
  // tests); here, that each control edits its own exercise's and nothing else.
  it.each<[string, string, (scope: ReturnType<typeof card>) => void]>([
    ["a set's badge", BENCH_CARD, (bench) => press(bench, "2")],
    [
      "a set's stepper",
      BENCH_CARD,
      (bench) =>
        fireEvent.click(
          stepper(bench, "Set 2 reps").getByRole("button", { name: "Increase set 2 reps" }),
        ),
    ],
    ["a set's ×", BENCH_CARD, (bench) => press(bench, "Remove set 2")],
    ["+ Add set", OHP_CARD, (ohp) => press(ohp, "+ Add set")],
    ["+ Warmup", OHP_CARD, (ohp) => press(ohp, "+ Warmup")],
    ["a load mode", PLANK_CARD, (plank) => choose(plank, "%1RM")],
    [
      "the Rest stepper",
      BENCH_CARD,
      (bench) =>
        fireEvent.click(stepper(bench, "Rest").getByRole("button", { name: "Increase rest" })),
    ],
    [
      "the note",
      OHP_CARD,
      (ohp) =>
        fireEvent.change(ohp.getByRole("textbox", { name: "Note" }), {
          target: { value: "Squeeze glutes" },
        }),
    ],
  ])("%s edits that exercise's prescription and nothing else", (_, name, act) => {
    const planner = renderPush();
    const rows = () => dayOf(planner.program(), "d-push").exercises;
    const edited = rows().findIndex((row) => row.id === ROW_OF[name]);
    const others = (program: ReturnType<typeof planner.program>) => ({
      ...program,
      days: program.days.map((day) =>
        day.id === "d-push"
          ? { ...day, exercises: day.exercises.filter((_, i) => i !== edited) }
          : day,
      ),
    });
    const before = planner.program();

    act(card(name));

    expect(rows()[edited]).not.toEqual(dayOf(before, "d-push").exercises[edited]);
    expect(others(planner.program())).toEqual(others(before));
  });

  it("edits a cycled slot's prescription inside a slot card", () => {
    const planner = renderPlanner(rotationPlan());

    press(card("Lats"), "+ Add set");

    const [chest, lats] = dayOf(planner.program(), "d-upper").slots;
    expect(lats!.sets).toHaveLength(3);
    expect(chest!.sets).toHaveLength(3);
  });
});
