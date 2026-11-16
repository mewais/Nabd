/**
 * B22 · @nabd/modals — SessionModal (the set logger), plus the shared
 * ModalShell / CloseButton behaviour every modal relies on.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CloseButton, ModalShell, SessionModal } from "@nabd/modals";
import type { SessionModalProps, SessionVM } from "@nabd/modals";
import { did, lastWeek, pushDay } from "../support/plan-fixtures";
import { sessionVM } from "./fixtures";

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
  const props: SessionModalProps = {
    vm,
    onPick: vi.fn(),
    onStepReps: vi.fn(),
    onStepWeight: vi.fn(),
    onSetReps: vi.fn(),
    onSetWeight: vi.fn(),
    onApplyAdvice: vi.fn(),
    onLog: vi.fn(),
    onUndo: vi.fn(),
    onLogOther: vi.fn(),
    onClose: vi.fn(),
  };
  const view = render(<SessionModal {...props} />);
  /** The −/+ buttons that belong to the field labelled `label`. */
  const stepper = (label: string) => {
    const field = screen.getByLabelText(label);
    if (!field.parentElement) throw new Error(`no stepper around "${label}"`);
    return within(field.parentElement);
  };
  /** The row for `exercise` in the left-hand list of today's exercises. */
  const listRow = (exercise: string): HTMLElement => {
    const row = screen
      .getAllByText(exercise)
      .map((el) => el.closest<HTMLElement>("button[data-row-active]"))
      .find((el) => el !== null);
    if (!row) throw new Error(`no list row for "${exercise}"`);
    return row;
  };
  return { props, stepper, listRow, ...view };
}

describe("SessionModal", () => {
  it("shows the exercise being logged: set position, target, notes and advice", () => {
    const { container } = setup();

    expect(screen.getByText("Set 3 of 3 · Working set · 8–12 reps · RPE 8")).toBeInTheDocument();
    expect(screen.getByText("Pause at the chest")).toBeInTheDocument();
    expect(screen.getByText("Front Delts")).toBeInTheDocument();
    expect(container).toHaveTextContent("Last time: 7 × 60 kg");
    expect(screen.getByLabelText("Reps")).toHaveValue(9);
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue(60);
  });

  it("lists today's exercises and marks the active, finished and skipped ones", () => {
    const { listRow } = setup();

    expect(listRow("Bench Press")).toHaveAttribute("data-row-active", "true");
    expect(listRow("Bench Press")).toHaveTextContent("2/3");
    expect(listRow("Barbell Row")).toHaveAttribute("data-row-active", "false");
    expect(within(listRow("Barbell Row")).getByLabelText("complete")).toBeInTheDocument();
    expect(within(listRow("Bench Press")).queryByLabelText("complete")).toBeNull();
    expect(listRow("Plank")).toHaveTextContent("Skipped today");
    expect(listRow("Plank")).not.toHaveTextContent("Abs, Obliques");
  });

  it("picking another exercise reports its plan item", () => {
    const { props, listRow } = setup();
    fireEvent.click(listRow("Barbell Row"));
    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith("p-row");
  });

  it("the steppers nudge reps and weight down and up", () => {
    const { props, stepper } = setup();

    fireEvent.click(stepper("Reps").getByRole("button", { name: "increase" }));
    expect(props.onStepReps).toHaveBeenLastCalledWith(1);
    fireEvent.click(stepper("Reps").getByRole("button", { name: "decrease" }));
    expect(props.onStepReps).toHaveBeenLastCalledWith(-1);
    expect(props.onStepWeight).not.toHaveBeenCalled();

    fireEvent.click(stepper("Weight (kg)").getByRole("button", { name: "decrease" }));
    expect(props.onStepWeight).toHaveBeenLastCalledWith(-1);
    fireEvent.click(stepper("Weight (kg)").getByRole("button", { name: "increase" }));
    expect(props.onStepWeight).toHaveBeenLastCalledWith(1);
    expect(props.onStepReps).toHaveBeenCalledTimes(2);
  });

  it("typed values are reported as numbers; non-numbers are ignored", () => {
    const { props } = setup();

    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "12" } });
    expect(props.onSetReps).toHaveBeenLastCalledWith(12);

    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "62.5" } });
    expect(props.onSetWeight).toHaveBeenLastCalledWith(62.5);

    fireEvent.change(screen.getByLabelText("Reps"), { target: { value: "" } });
    expect(props.onSetReps).toHaveBeenCalledTimes(1);
  });

  it("an unweighted exercise has no weight field, and counts seconds when timed", () => {
    const vm = sessionVM({ program: pushDay(), history: lastWeek() }, "p-plank");
    setup(vm);

    expect(screen.getByLabelText("Sec")).toHaveValue(30);
    expect(screen.queryByLabelText(/Weight/)).toBeNull();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  });

  it("the advice targets apply the suggestion they name", () => {
    const vm = sessionVM({ program: pushDay(), history: [...lastWeek(), SETS.warmup] }, "p-bench");
    const { props } = setup(vm);

    fireEvent.click(screen.getByRole("button", { name: "9 × 60 kg" }));
    expect(props.onApplyAdvice).toHaveBeenLastCalledWith("primary");
    fireEvent.click(screen.getByRole("button", { name: "8 × 62.5 kg" }));
    expect(props.onApplyAdvice).toHaveBeenLastCalledWith("alternative");
  });

  it("shows no advice for a warm-up", () => {
    const { container } = setup(sessionVM({ program: pushDay(), history: lastWeek() }, "p-bench"));
    expect(screen.getByText("Set 1 of 3 · Warm-up · 10 reps")).toBeInTheDocument();
    expect(container.textContent).not.toContain("Try ");
  });

  it("Log this set logs, and nothing else", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Log this set" }));
    expect(props.onLog).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onUndo).not.toHaveBeenCalled();
  });

  it("lists the sets logged today and deletes the one that is asked for", () => {
    const { props } = setup();

    expect(screen.getByText("10 × 40 kg")).toBeInTheDocument();
    expect(screen.getByText("9 × 60 kg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete set 2" }));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onUndo).toHaveBeenCalledWith(SETS.first.id);

    fireEvent.click(screen.getByRole("button", { name: "Delete set 1" }));
    expect(props.onUndo).toHaveBeenLastCalledWith(SETS.warmup.id);
  });

  it("shows the rest countdown only while resting", () => {
    const resting = setup({ ...benchVM(), restLabel: "Rest 1:20" });
    expect(screen.getByText("Rest 1:20")).toBeInTheDocument();
    resting.unmount();

    setup({ ...benchVM(), restLabel: null });
    expect(screen.queryByText(/^Rest \d/)).toBeNull();
  });

  it("+ Something else asks to log an exercise outside the plan", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "+ Something else" }));
    expect(props.onLogOther).toHaveBeenCalledTimes(1);
    expect(props.onPick).not.toHaveBeenCalled();
  });

  it("the footer counts the sets logged today", () => {
    const some = setup();
    expect(screen.getByText("4 sets logged today")).toBeInTheDocument();
    some.unmount();

    setup(sessionVM({ program: pushDay() }, "p-bench"));
    expect(screen.getByText("No sets logged yet today")).toBeInTheDocument();
  });

  // Suspected source bug (packages/B22-modals/src/session-modal.ts, footer text):
  // the count is not pluralised, so one set reads "1 sets logged today".
  it.fails("the footer says '1 set', not '1 sets', after a single set", () => {
    setup(sessionVM({ program: pushDay(), history: [did("p-row", "row", 12, 50)] }, "p-row"));
    expect(screen.getByText("1 set logged today")).toBeInTheDocument();
  });

  it("Done, the ✕ and a click on the backdrop all close the logger", () => {
    const { props, container } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(container.querySelector("[data-modal-backdrop]")!);
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it("working inside the panel does not close it", () => {
    const { props } = setup();
    fireEvent.click(screen.getByText("Pause at the chest"));
    fireEvent.click(screen.getByRole("button", { name: "Log this set" }));
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe("ModalShell", () => {
  it("renders its content and closes only when the backdrop itself is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModalShell onClose={onClose} zIndex={50} panelStyle={{ width: 300 }}>
        <p>Panel content</p>
      </ModalShell>,
    );

    fireEvent.click(screen.getByText("Panel content"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector("[data-modal-backdrop]")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("CloseButton is an accessible Close control", () => {
    const onClose = vi.fn();
    render(<CloseButton onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
