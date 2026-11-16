// The set table of one exercise (or slot), driven through the planner.

import { fireEvent, screen } from "@testing-library/react";
import { officeStrength, rotationPlan } from "../support/programs";
import { dayOf } from "./fixtures";
import { card, renderPlanner, stepper } from "./render";

const BENCH_CARD = "Barbell Bench Press";
const OHP_CARD = "Barbell Overhead Press";
const PLANK_CARD = "Plank";

const press = (scope: ReturnType<typeof card>, name: string | RegExp): void => {
  fireEvent.click(scope.getByRole("button", { name }));
};

/** Pick one of a card's options: a rep mode or a load mode. */
const choose = (scope: ReturnType<typeof card>, name: string): void => {
  fireEvent.click(scope.getByRole("radio", { name }));
};

/** The planner on Monday's "Push" day, and that day's exercise rows after every edit. */
function renderPush() {
  const planner = renderPlanner(officeStrength());
  const [bench, ohp, plank] = [0, 1, 2].map(
    (index) => () => dayOf(planner.program(), "d-push").exercises[index]!,
  );
  return { bench: bench!, ohp: ohp!, plank: plank! };
}

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

  it("clicking a badge cycles that set's type", () => {
    const { bench } = renderPush();

    press(card(BENCH_CARD), "2");

    expect(bench().sets.map((s) => s.type)).toEqual(["warmup", "working", "warmup", "drop"]);
  });

  it.each([
    ["Set 2 reps", "Increase", { amount: 9, upTo: 10, intensity: 8 }],
    ["Set 2 reps", "Decrease", { amount: 7, upTo: 10, intensity: 8 }],
    ["Set 2 top of range", "Increase", { amount: 8, upTo: 11, intensity: 8 }],
    ["Set 2 top of range", "Decrease", { amount: 8, upTo: 9, intensity: 8 }],
    ["Set 2 RPE", "Increase", { amount: 8, upTo: 10, intensity: 8.5 }],
    ["Set 2 RPE", "Decrease", { amount: 8, upTo: 10, intensity: 7.5 }],
  ])("%s → %s edits only its own value", (group, direction, expected) => {
    const { bench } = renderPush();

    const name = `${direction} ${group.charAt(0).toLowerCase()}${group.slice(1)}`;
    fireEvent.click(stepper(card(BENCH_CARD), group).getByRole("button", { name }));

    expect(bench().sets[1]).toMatchObject(expected);
    expect(bench().sets[0]).toEqual({ type: "warmup", amount: 10, upTo: 12, intensity: 6 });
  });

  it("× removes that set", () => {
    const { bench } = renderPush();

    press(card(BENCH_CARD), "Remove set 2");

    expect(bench().sets.map((s) => [s.type, s.amount])).toEqual([
      ["warmup", 10],
      ["working", 6],
      ["drop", 12],
    ]);
  });

  it("+ Add set appends a working set and + Warmup prepends a warm-up, on that exercise only", () => {
    const { bench, ohp } = renderPush();

    press(card(OHP_CARD), "+ Add set");
    expect(ohp().sets).toHaveLength(4);
    expect(ohp().sets.at(-1)).toEqual({ type: "working", amount: 5, intensity: 75 });

    press(card(OHP_CARD), "+ Warmup");
    expect(ohp().sets).toHaveLength(5);
    expect(ohp().sets[0]).toMatchObject({ type: "warmup", amount: 5 });
    expect(bench().sets).toHaveLength(4);
    expect(screen.getByText("3 exercises · 11 sets")).toBeInTheDocument();
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

  it("switching the load mode starts every set from the new scale", () => {
    const { bench } = renderPush();
    expect(bench().sets.map((s) => s.intensity)).toEqual([6, 8, 8.5, 9]);

    choose(card(BENCH_CARD), "%1RM");

    // An RPE of 8.5 must not come back as 8.5% of a one-rep max.
    expect(bench().sets.map((s) => s.intensity)).toEqual([70, 70, 70, 70]);
  });

  it("switching load to %1RM gives every set a percentage, None clears it", () => {
    const { plank, bench } = renderPush();

    choose(card(PLANK_CARD), "%1RM");
    expect(plank().intensity).toBe("pct");
    expect(plank().sets.map((s) => s.intensity)).toEqual([70, 70]);

    choose(card(BENCH_CARD), "None");
    expect(bench().intensity).toBe("none");
    expect(bench().sets.every((s) => s.intensity === undefined)).toBe(true);
  });

  it("the Rest stepper moves rest in 15 s steps", () => {
    const { bench } = renderPush();
    const rest = () => stepper(card(BENCH_CARD), "Rest");

    fireEvent.click(rest().getByRole("button", { name: "Increase rest" }));
    expect(bench().rest).toBe(165);

    fireEvent.click(rest().getByRole("button", { name: "Decrease rest" }));
    fireEvent.click(rest().getByRole("button", { name: "Decrease rest" }));
    expect(bench().rest).toBe(135);
  });

  it("typing a note stores it on the prescription", () => {
    const { ohp } = renderPush();

    fireEvent.change(card(OHP_CARD).getByRole("textbox", { name: "Note" }), {
      target: { value: "Squeeze glutes" },
    });

    expect(ohp().notes).toBe("Squeeze glutes");
  });

  it("edits a cycled slot's prescription inside a slot card", () => {
    const planner = renderPlanner(rotationPlan());

    press(card("Lats"), "+ Add set");

    const [chest, lats] = dayOf(planner.program(), "d-upper").slots;
    expect(lats!.sets).toHaveLength(3);
    expect(chest!.sets).toHaveLength(3);
  });
});
