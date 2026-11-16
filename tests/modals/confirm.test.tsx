/**
 * @nabd/modals — the confirmation asked before something that cannot be
 * undone: what it says for each such action, and what its buttons report.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmModal, buildConfirmVM } from "@nabd/modals";
import type { ConfirmActions } from "@nabd/modals";

describe("buildConfirmVM", () => {
  it("names the day or the exercise about to be deleted, and what is kept", () => {
    expect(buildConfirmVM({ kind: "deleteDay", name: "Push" })).toEqual({
      title: "Delete Push?",
      text: "The day and everything planned on it leave your plan. Sets you have logged stay in your history.",
      confirmLabel: "Delete day",
    });
    expect(buildConfirmVM({ kind: "deleteExercise", name: "Desk Dips" })).toEqual({
      title: "Delete Desk Dips?",
      text: "It leaves the library and your plan. Sets you have logged stay in your history.",
      confirmLabel: "Delete exercise",
    });
  });

  it("says that an import replaces what is stored, and that a backup comes first", () => {
    const vm = buildConfirmVM({ kind: "import" });
    expect(vm).toMatchObject({ title: "Replace your data?", confirmLabel: "Import" });
    expect(vm.text).toMatch(/replaces your plan, your history and your settings/);
    expect(vm.text).toMatch(/A backup of what you have now is written/);
  });
});

describe("ConfirmModal", () => {
  it("asks the question and reports the answer", () => {
    const actions: ConfirmActions = { confirm: vi.fn(), cancel: vi.fn() };
    render(
      <ConfirmModal vm={buildConfirmVM({ kind: "deleteDay", name: "Push" })} actions={actions} />,
    );
    expect(screen.getByRole("dialog", { name: "Delete Push?" })).toHaveTextContent(
      "everything planned on it",
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(actions.cancel).toHaveBeenCalledTimes(1);
    expect(actions.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete day" }));
    expect(actions.confirm).toHaveBeenCalledTimes(1);
  });
});
