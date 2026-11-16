/**
 * @nabd/modals — SessionModal: the set logger renders its view-model
 * and reports every action.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { SessionModal } from "@nabd/modals";
import type { SessionActions, SessionVM } from "@nabd/modals";
import { did, lastWeek, pushDay } from "../support/programs";
import { sessionVM } from "./fixtures";
import { modalBackdrop } from "../support/dom";

/** Bench Press, warm-up done and one working set logged; rows finished; plank skipped. */
const SETS = {
  warmup: did("p-bench", "bench", 10, 40, { setType: "warmup" }),
  first: did("p-bench", "bench", 9, 60),
};
const benchVM = (): SessionVM =>
  sessionVM(
    {
      program: pushDay(),
      skipped: ["p-plank"],
      history: [
        ...lastWeek(),
        SETS.warmup,
        SETS.first,
        did("p-row", "row", 12, 50),
        did("p-row", "row", 12, 50),
      ],
    },
    "p-bench",
  );

function setup(vm: SessionVM = benchVM()) {
  const actions: SessionActions = {
    focusItem: vi.fn(),
    stepReps: vi.fn(),
    stepWeight: vi.fn(),
    setReps: vi.fn(),
    setWeight: vi.fn(),
    applyAdvice: vi.fn(),
    logSet: vi.fn(),
    undoSet: vi.fn(),
    logOther: vi.fn(),
    close: vi.fn(),
  };
  const view = render(<SessionModal vm={vm} actions={actions} />);
  /** The −/+ buttons that belong to the field labelled `label`. */
  const stepper = (label: string) => {
    const group = screen.getByLabelText(label).closest<HTMLElement>('[role="group"]');
    if (!group) throw new Error(`no stepper around "${label}"`);
    return within(group);
  };
  const list = within(screen.getByRole("navigation", { name: "Today's exercises" }));
  /** The row for `exercise` in the left-hand list of today's exercises. */
  const listRow = (exercise: string): HTMLElement =>
    list.getByRole("button", { name: new RegExp(exercise) });
  return { actions, stepper, listRow, ...view };
}

describe("SessionModal", () => {
  it("shows the exercise being logged: set position, target, notes and advice", () => {
    setup();

    expect(screen.getByRole("heading", { name: "Bench Press" })).toBeInTheDocument();
    expect(screen.getByText("Set 3 of 3 · Working set · 8–12 reps · RPE 8")).toBeInTheDocument();
    expect(screen.getByText("Pause at the chest")).toBeInTheDocument();
    expect(screen.getByText("Front Delts")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Last time: 7 × 60 kg");
    expect(screen.getByLabelText("Reps")).toHaveValue("9");
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue("60");
  });

  it("lists today's exercises and marks the active, finished and skipped ones", () => {
    const { listRow } = setup();

    expect(listRow("Bench Press")).toHaveAttribute("aria-current", "true");
    expect(listRow("Bench Press")).toHaveTextContent("2/3");
    expect(listRow("Barbell Row")).toHaveAttribute("aria-current", "false");
    expect(within(listRow("Barbell Row")).getByLabelText("complete")).toBeInTheDocument();
    expect(within(listRow("Bench Press")).queryByLabelText("complete")).toBeNull();
    expect(listRow("Plank")).toHaveTextContent("Skipped today");
    expect(listRow("Plank")).not.toHaveTextContent("Abs, Obliques");
  });

  it("picking another exercise reports its plan item", () => {
    const { actions, listRow } = setup();
    fireEvent.click(listRow("Barbell Row"));
    expect(actions.focusItem).toHaveBeenCalledTimes(1);
    expect(actions.focusItem).toHaveBeenCalledWith("p-row");
  });

  it("the steppers nudge reps and weight down and up", () => {
    const { actions, stepper } = setup();

    fireEvent.click(stepper("Reps").getByRole("button", { name: "increase" }));
    expect(actions.stepReps).toHaveBeenLastCalledWith(1);
    fireEvent.click(stepper("Reps").getByRole("button", { name: "decrease" }));
    expect(actions.stepReps).toHaveBeenLastCalledWith(-1);
    expect(actions.stepWeight).not.toHaveBeenCalled();

    fireEvent.click(stepper("Weight (kg)").getByRole("button", { name: "decrease" }));
    expect(actions.stepWeight).toHaveBeenLastCalledWith(-1);
    fireEvent.click(stepper("Weight (kg)").getByRole("button", { name: "increase" }));
    expect(actions.stepWeight).toHaveBeenLastCalledWith(1);
    expect(actions.stepReps).toHaveBeenCalledTimes(2);
  });

  it("typed values are reported as numbers; non-numbers are ignored", () => {
    const { actions } = setup();

    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "12" } });
    expect(actions.setReps).toHaveBeenLastCalledWith(12);

    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "62.5" } });
    expect(actions.setWeight).toHaveBeenLastCalledWith(62.5);

    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "" } });
    expect(actions.setReps).toHaveBeenCalledTimes(1);
  });

  it("Enter in either field logs the set; ↑ and ↓ step the field they are pressed in", () => {
    const { actions } = setup();

    fireEvent.keyDown(screen.getByLabelText("Weight (kg)"), { key: "ArrowUp" });
    expect(actions.stepWeight).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(screen.getByLabelText("Reps"), { key: "ArrowDown" });
    expect(actions.stepReps).toHaveBeenLastCalledWith(-1);

    fireEvent.keyDown(screen.getByLabelText("Reps"), { key: "Enter" });
    fireEvent.keyDown(screen.getByLabelText("Weight (kg)"), { key: "Enter" });
    expect(actions.logSet).toHaveBeenCalledTimes(2);
  });

  it("says which logged sets are not saved yet", () => {
    setup(
      sessionVM(
        { program: pushDay(), history: [...lastWeek(), SETS.warmup, SETS.first] },
        "p-bench",
        { unsaved: [SETS.first.id] },
      ),
    );
    const sets = within(screen.getByRole("region", { name: "Logged today" })).getAllByRole(
      "listitem",
    );
    expect(sets[0]).not.toHaveTextContent(/not saved yet/i);
    expect(sets[1]).toHaveTextContent(/not saved yet/i);
  });

  it("an unweighted exercise has no weight field, and counts seconds when timed", () => {
    setup(sessionVM({ program: pushDay(), history: lastWeek() }, "p-plank"));

    expect(screen.getByLabelText("Sec")).toHaveValue("30");
    expect(screen.queryByLabelText(/Weight/)).toBeNull();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("the advice targets apply the suggestion they name", () => {
    const vm = sessionVM({ program: pushDay(), history: [...lastWeek(), SETS.warmup] }, "p-bench");
    const { actions } = setup(vm);

    fireEvent.click(screen.getByRole("button", { name: "9 × 60 kg" }));
    expect(actions.applyAdvice).toHaveBeenLastCalledWith("primary");
    fireEvent.click(screen.getByRole("button", { name: "8 × 62.5 kg" }));
    expect(actions.applyAdvice).toHaveBeenLastCalledWith("alternative");
  });

  it("shows no advice for a warm-up", () => {
    setup(sessionVM({ program: pushDay(), history: lastWeek() }, "p-bench"));
    expect(screen.getByText("Set 1 of 3 · Warm-up · 10 reps")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Try ");
  });

  it("Log this set logs, and nothing else", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Log this set" }));
    expect(actions.logSet).toHaveBeenCalledTimes(1);
    expect(actions.close).not.toHaveBeenCalled();
    expect(actions.undoSet).not.toHaveBeenCalled();
  });

  it("lists the sets logged today and deletes the one that is asked for", () => {
    const { actions } = setup();
    const logged = within(screen.getByRole("region", { name: "Logged today" }));

    expect(logged.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Set 110 × 40 kg",
      "Set 29 × 60 kg",
    ]);

    fireEvent.click(logged.getByRole("button", { name: "Delete set 2" }));
    expect(actions.undoSet).toHaveBeenCalledTimes(1);
    expect(actions.undoSet).toHaveBeenCalledWith(SETS.first.id);

    fireEvent.click(logged.getByRole("button", { name: "Delete set 1" }));
    expect(actions.undoSet).toHaveBeenLastCalledWith(SETS.warmup.id);
  });

  it("shows the rest countdown only while resting", () => {
    const vm = benchVM();
    const resting = setup({ ...vm, form: { ...vm.form, restLabel: "Rest 1:20" } });
    expect(screen.getByRole("timer")).toHaveTextContent("Rest 1:20");
    resting.unmount();

    setup({ ...vm, form: { ...vm.form, restLabel: null } });
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("+ Something else asks to log an exercise outside the plan", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByRole("button", { name: "+ Something else" }));
    expect(actions.logOther).toHaveBeenCalledTimes(1);
    expect(actions.focusItem).not.toHaveBeenCalled();
  });

  it("the footer says how much has been logged today", () => {
    setup();
    expect(screen.getByText("4 sets logged today")).toBeInTheDocument();
  });

  it("Done, the ✕ and a click on the backdrop all close the logger", () => {
    const { actions } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(actions.close).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(actions.close).toHaveBeenCalledTimes(2);
    fireEvent.click(modalBackdrop());
    expect(actions.close).toHaveBeenCalledTimes(3);
  });

  it("working inside the panel does not close it", () => {
    const { actions } = setup();
    fireEvent.click(screen.getByText("Pause at the chest"));
    fireEvent.click(screen.getByRole("button", { name: "Log this set" }));
    expect(actions.close).not.toHaveBeenCalled();
  });
});
