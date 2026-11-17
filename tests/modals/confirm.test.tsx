/**
 * @nabd/modals — the confirmation asked before something that cannot be
 * undone: what it says for each such action, and what its buttons report.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { APPDATA_VERSION } from "@nabd/domain";
import { ConfirmModal, buildConfirmVM } from "@nabd/modals";
import type { ConfirmActions } from "@nabd/modals";
import type { Confirmation } from "@nabd/view";
import { LIBRARY } from "../support/exercises";
import { pushPull } from "../support/programs";

/** What `buildConfirmVM` says about `confirmation`, naming days of the Push / Pull plan and library exercises. */
const confirmOf = (confirmation: Confirmation) =>
  buildConfirmVM({ confirmation, program: pushPull, lookup: LIBRARY.lookup });

describe("buildConfirmVM", () => {
  it("names the day or the exercise about to be deleted, and what is kept", () => {
    expect(confirmOf({ kind: "deleteDay", dayId: "mon" })).toEqual({
      title: "Delete Push?",
      text: "The day and everything planned on it leave your plan. Sets you have logged stay in your history.",
      confirmLabel: "Delete day",
    });
    expect(confirmOf({ kind: "deleteExercise", exId: "dip" })).toEqual({
      title: "Delete Weighted Dip?",
      text: "It leaves the library and your plan. Sets you have logged stay in your history.",
      confirmLabel: "Delete exercise",
    });
  });

  it("falls back on a plain name for a day or an exercise that is gone", () => {
    expect(confirmOf({ kind: "deleteDay", dayId: "gone" }).title).toBe("Delete this day?");
    expect(confirmOf({ kind: "deleteExercise", exId: "gone" }).title).toBe("Delete this exercise?");
  });

  it("says that an import replaces what is stored, and that a backup comes first", () => {
    const vm = confirmOf({ kind: "import", data: { app: "Nabd", version: APPDATA_VERSION } });
    expect(vm).toMatchObject({ title: "Replace your data?", confirmLabel: "Import" });
    expect(vm.text).toMatch(/replaces your plan, your history and your settings/);
    expect(vm.text).toMatch(/A backup of what you have now is written/);
  });
});

describe("ConfirmModal", () => {
  it("asks the question and reports the answer", () => {
    const actions: ConfirmActions = { confirm: vi.fn(), cancel: vi.fn() };
    render(<ConfirmModal vm={confirmOf({ kind: "deleteDay", dayId: "mon" })} actions={actions} />);
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
