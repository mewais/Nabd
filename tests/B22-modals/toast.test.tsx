/**
 * B22 · @nabd/modals — NotificationToast: the "time to move" nudge.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationToast } from "@nabd/modals";

describe("NotificationToast", () => {
  const setup = () => {
    const onConfirm = vi.fn();
    const onSnooze = vi.fn();
    render(
      <NotificationToast
        reasonLabel="You've gone quiet"
        exercise="Bench Press"
        sub="Set 2 of 3 · Working set · 8–12 reps"
        onConfirm={onConfirm}
        onSnooze={onSnooze}
      />,
    );
    return { onConfirm, onSnooze };
  };

  it("says why it fired and which set is up", () => {
    setup();
    expect(screen.getByText("TIME TO MOVE")).toBeInTheDocument();
    expect(screen.getByText("You've gone quiet")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Set 2 of 3 · Working set · 8–12 reps")).toBeInTheDocument();
  });

  it("Let's go confirms without snoozing", () => {
    const { onConfirm, onSnooze } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it("Snooze snoozes without confirming", () => {
    const { onConfirm, onSnooze } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));
    expect(onSnooze).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
