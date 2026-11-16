/**
 * @nabd/modals — Toast: the "time to move" nudge.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { Toast } from "@nabd/modals";
import type { ToastActions, ToastVM } from "@nabd/modals";

describe("Toast", () => {
  const VM: ToastVM = {
    title: "Time to move",
    reason: "You've gone quiet",
    exercise: "Bench Press",
    detail: "Chest · set 2 of 3",
  };
  const setup = () => {
    const actions: ToastActions = { start: vi.fn(), snooze: vi.fn() };
    render(<Toast vm={VM} actions={actions} />);
    return actions;
  };

  it("says why it fired and which set is up", () => {
    setup();
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Time to move");
    expect(toast).toHaveTextContent("You've gone quiet");
    expect(toast).toHaveTextContent("Bench Press");
    expect(toast).toHaveTextContent("Chest · set 2 of 3");
  });

  it("Let's go starts the set without snoozing", () => {
    const actions = setup();
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(actions.start).toHaveBeenCalledTimes(1);
    expect(actions.snooze).not.toHaveBeenCalled();
  });

  it("Snooze snoozes without starting", () => {
    const actions = setup();
    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));
    expect(actions.snooze).toHaveBeenCalledTimes(1);
    expect(actions.start).not.toHaveBeenCalled();
  });
});
