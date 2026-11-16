import { render, screen } from "@testing-library/react";
import type { AdviceWording } from "@nabd/domain";
import { NextSetBlock } from "@nabd/design-system";
import { click } from "./render";

const ADVICE: AdviceWording = {
  primary: "9 × 25 lb",
  alternative: "8 × 27.5 lb",
  reason: "One more rep, or the same reps heavier.",
  basis: "Last time: 8 × 25 lb",
};

/** The next set of a bench press with `advice`, its targets applied through `onApply` when given. */
const renderAdvice = (advice: AdviceWording, onApply?: (which: string) => void) =>
  render(
    <NextSetBlock
      exercise="Bench Press"
      line={null}
      muscleNames={[]}
      notes=""
      advice={advice}
      onApplyAdvice={onApply}
    />,
  );

describe("NextSetBlock · the coach's advice", () => {
  it("shows both targets and the reasoning", () => {
    renderAdvice(ADVICE);
    expect(screen.getByText("9 × 25 lb")).toBeInTheDocument();
    expect(screen.getByText("8 × 27.5 lb")).toBeInTheDocument();
    expect(
      screen.getByText("Last time: 8 × 25 lb · One more rep, or the same reps heavier."),
    ).toBeInTheDocument();
  });

  it("leaves out the alternative and the basis when there are none", () => {
    renderAdvice({ ...ADVICE, alternative: null, basis: null });
    expect(screen.getByText("Try")).toHaveTextContent(/^Try 9 × 25 lb$/);
    expect(screen.getByText("One more rep, or the same reps heavier.")).toBeInTheDocument();
  });

  it("is read-only without onApplyAdvice", () => {
    renderAdvice(ADVICE);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("turns each target into a button that applies it", () => {
    const onApply = vi.fn();
    renderAdvice(ADVICE, onApply);
    click("9 × 25 lb");
    expect(onApply).toHaveBeenLastCalledWith("primary");
    click("8 × 27.5 lb");
    expect(onApply).toHaveBeenLastCalledWith("alternative");
  });
});
