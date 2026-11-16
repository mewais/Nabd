/**
 * @nabd/modals — LibraryModal: browsing the exercise library and
 * creating a custom exercise.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { LibraryModal } from "@nabd/modals";
import type { LibraryActions, LibraryVM } from "@nabd/modals";

type BrowseVM = Extract<LibraryVM, { mode: "browse" }>;
type CreateVM = Extract<LibraryVM, { mode: "create" }>;

const BROWSE: BrowseVM = {
  title: "Add Exercise",
  mode: "browse",
  browser: {
    search: "",
    group: "all",
    rows: [
      {
        id: "bench",
        name: "Bench Press",
        detail: "Chest, Triceps · Weight & reps · Barbell",
        custom: false,
        addLabel: "Add Bench Press",
      },
      {
        id: "my-squat",
        name: "Goblet Squat",
        detail: "Quads, Glutes · Weight & reps · Kettlebell",
        custom: true,
        addLabel: "Add Goblet Squat",
      },
    ],
    emptyNote: null,
  },
};

const CREATE: CreateVM = {
  title: "Add Exercise",
  mode: "create",
  form: {
    name: "Goblet Squat",
    primary: ["quads"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
    canCreate: true,
  },
};

function setup(vm: LibraryVM) {
  const actions: LibraryActions = {
    close: vi.fn(),
    filter: vi.fn(),
    pick: vi.fn(),
    startDraft: vi.fn(),
    patchDraft: vi.fn(),
    cancelDraft: vi.fn(),
    saveDraft: vi.fn(),
    deleteCustom: vi.fn(),
  };
  render(<LibraryModal vm={vm} actions={actions} />);
  return actions;
}

describe("LibraryModal · browsing", () => {
  const browsing = (browser: Partial<BrowseVM["browser"]> = {}) =>
    setup({ ...BROWSE, browser: { ...BROWSE.browser, ...browser } });
  /** The row (add, duplicate and maybe delete buttons) of the exercise called `name`. */
  const row = (name: string) => {
    const item = screen.getByRole("button", { name: `Add ${name}` }).closest("li");
    if (!item) throw new Error(`no library row for "${name}"`);
    return within(item);
  };

  it("is a dialog with the title, listing each exercise with its details", () => {
    browsing();
    expect(screen.getByRole("dialog", { name: "Add Exercise" })).toBeInTheDocument();
    expect(row("Bench Press").getByText("Chest, Triceps · Weight & reps · Barbell")).toBeVisible();
    expect(
      row("Goblet Squat").getByText("Quads, Glutes · Weight & reps · Kettlebell"),
    ).toBeVisible();
  });

  it("reflects the current search and reports what is typed", () => {
    const actions = browsing({ search: "ben" });
    const box = screen.getByRole("searchbox", { name: "Search exercises" });
    expect(box).toHaveValue("ben");
    fireEvent.change(box, { target: { value: "bench" } });
    expect(actions.filter).toHaveBeenCalledWith({ search: "bench" });
  });

  it("marks the active group filter and reports a newly chosen one", () => {
    const actions = browsing({ group: "Chest" });
    const groups = within(screen.getByRole("group", { name: "Muscle group" }));
    expect(groups.getByRole("button", { name: "Chest" })).toHaveAttribute("aria-pressed", "true");
    expect(groups.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(groups.getByRole("button", { name: "Quads" }));
    expect(actions.filter).toHaveBeenLastCalledWith({ group: "Quads" });
  });

  it("choosing All clears the group filter", () => {
    const actions = browsing({ group: "Chest" });
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(actions.filter).toHaveBeenLastCalledWith({ group: null });
  });

  it("picking an exercise reports its id", () => {
    const actions = browsing();
    fireEvent.click(screen.getByRole("button", { name: "Add Goblet Squat" }));
    expect(actions.pick).toHaveBeenCalledTimes(1);
    expect(actions.pick).toHaveBeenCalledWith("my-squat");
    expect(actions.startDraft).not.toHaveBeenCalled();
  });

  it("any exercise can be duplicated into a custom one", () => {
    const actions = browsing();
    fireEvent.click(row("Bench Press").getByRole("button", { name: "Duplicate & edit" }));
    expect(actions.startDraft).toHaveBeenCalledWith("bench");
    expect(actions.pick).not.toHaveBeenCalled();
  });

  it("only custom exercises are badged and can be deleted", () => {
    const actions = browsing();
    const remove = { name: "Delete custom exercise" };
    expect(row("Bench Press").queryByRole("button", remove)).toBeNull();
    expect(row("Bench Press").queryByText("CUSTOM")).toBeNull();
    expect(row("Goblet Squat").getByText("CUSTOM")).toBeInTheDocument();

    fireEvent.click(row("Goblet Squat").getByRole("button", remove));
    expect(actions.deleteCustom).toHaveBeenCalledWith("my-squat");
    expect(actions.pick).not.toHaveBeenCalled();
  });

  it("shows the empty note when nothing matches", () => {
    browsing({ rows: [], emptyNote: "No exercises match." });
    expect(screen.getByText("No exercises match.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("the ✕ closes the library", () => {
    const actions = browsing();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(actions.close).toHaveBeenCalledTimes(1);
  });

  it("offers to create a custom exercise from scratch", () => {
    const actions = browsing();
    fireEvent.click(screen.getByRole("button", { name: "Create custom exercise" }));
    expect(actions.startDraft).toHaveBeenCalledTimes(1);
    expect(actions.startDraft).toHaveBeenCalledWith();
  });
});

describe("LibraryModal · creating a custom exercise", () => {
  const creating = (form: Partial<CreateVM["form"]> = {}) =>
    setup({ ...CREATE, form: { ...CREATE.form, ...form } });
  const section = (title: string) => within(screen.getByRole("region", { name: title }));

  it("replaces the list and search with the form", () => {
    creating();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Exercise name" })).toHaveValue("Goblet Squat");
  });

  it("reports edits to the name", () => {
    const actions = creating();
    fireEvent.change(screen.getByRole("textbox", { name: "Exercise name" }), {
      target: { value: "Goblet Squat (pause)" },
    });
    expect(actions.patchDraft).toHaveBeenCalledWith({ name: "Goblet Squat (pause)" });
  });

  it("adds and removes primary muscles, leaving the secondary ones alone", () => {
    const actions = creating();
    const primary = section("Primary muscles");
    expect(primary.getByRole("button", { name: "Quads" })).toHaveAttribute("aria-pressed", "true");
    expect(section("Secondary muscles").getByRole("button", { name: "Quads" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(primary.getByRole("button", { name: "Glutes" }));
    expect(actions.patchDraft).toHaveBeenLastCalledWith({ primary: ["quads", "glutes"] });
    fireEvent.click(primary.getByRole("button", { name: "Quads" }));
    expect(actions.patchDraft).toHaveBeenLastCalledWith({ primary: [] });
  });

  it("adds and removes secondary muscles, leaving the primary ones alone", () => {
    const actions = creating({ secondary: ["glutes"] });
    const secondary = section("Secondary muscles");

    fireEvent.click(secondary.getByRole("button", { name: "Chest" }));
    expect(actions.patchDraft).toHaveBeenLastCalledWith({ secondary: ["glutes", "chest"] });
    fireEvent.click(secondary.getByRole("button", { name: "Glutes" }));
    expect(actions.patchDraft).toHaveBeenLastCalledWith({ secondary: [] });
  });

  it("shows how the exercise is tracked and reports a new choice", () => {
    const actions = creating();
    const trigger = screen.getByRole("button", { name: "How to track it" });
    expect(trigger).toHaveTextContent("Weight & reps");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Reps only" }));
    expect(actions.patchDraft).toHaveBeenCalledWith({ tracking: "reps_only" });
  });

  it("shows the equipment and reports a new choice", () => {
    const actions = creating();
    const trigger = screen.getByRole("button", { name: "Equipment" });
    expect(trigger).toHaveTextContent("Dumbbells");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Kettlebell" }));
    expect(actions.patchDraft).toHaveBeenCalledWith({ equipment: "kettlebell" });
  });

  it("Create saves the draft when it can be created", () => {
    const actions = creating();
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    expect(actions.saveDraft).toHaveBeenCalledTimes(1);
  });

  it("Create is disabled while the draft cannot be created", () => {
    const actions = creating({ primary: [], canCreate: false });
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();
    fireEvent.click(create);
    expect(actions.saveDraft).not.toHaveBeenCalled();
  });

  it("Back returns to browsing without creating or closing", () => {
    const actions = creating();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(actions.cancelDraft).toHaveBeenCalledTimes(1);
    expect(actions.saveDraft).not.toHaveBeenCalled();
    expect(actions.close).not.toHaveBeenCalled();
  });
});
