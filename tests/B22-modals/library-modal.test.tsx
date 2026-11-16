/**
 * B22 · @nabd/modals — LibraryModal: browsing the exercise library and
 * creating a custom exercise.
 */

// React must be in scope: the tests are compiled with the classic JSX transform.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { LibraryModal } from "@nabd/modals";
import type { LibraryItem, LibraryModalProps } from "@nabd/modals";

const ITEMS: LibraryItem[] = [
  {
    id: "bench",
    name: "Bench Press",
    muscles: "Chest, Triceps",
    trackLabel: "Weight & reps",
    equip: "Barbell",
    custom: false,
  },
  {
    id: "my-squat",
    name: "Goblet Squat",
    muscles: "Quads, Glutes",
    trackLabel: "Weight & reps",
    equip: "Kettlebell",
    custom: true,
  },
];

const chips = (active: string[]) =>
  [
    { k: "chest", label: "Chest" },
    { k: "quads", label: "Quads" },
    { k: "glutes", label: "Glutes" },
  ].map((c) => ({ ...c, active: active.includes(c.k) }));

function setup(over: Partial<LibraryModalProps> = {}) {
  const props: LibraryModalProps = {
    title: "Add an exercise",
    creating: false,
    search: "",
    groupChips: [
      { k: "all", label: "All", active: true },
      { k: "Chest", label: "Chest", active: false },
      { k: "Quads", label: "Quads", active: false },
    ],
    items: ITEMS,
    emptyMsg: "No exercises match.",
    draftName: "",
    draftTrack: "weight_reps",
    draftEquip: "dumbbell",
    primaryChips: chips([]),
    secondaryChips: chips([]),
    onClose: vi.fn(),
    onSearch: vi.fn(),
    onGroup: vi.fn(),
    onPick: vi.fn(),
    onCopy: vi.fn(),
    onDeleteCustom: vi.fn(),
    onStartCreate: vi.fn(),
    onCancelCreate: vi.fn(),
    onDraftName: vi.fn(),
    onDraftTrack: vi.fn(),
    onDraftEquip: vi.fn(),
    onTogglePrimary: vi.fn(),
    onToggleSecondary: vi.fn(),
    onCreate: vi.fn(),
    ...over,
  };
  const view = render(<LibraryModal {...props} />);
  /** The row (add + duplicate [+ delete] buttons) of the exercise called `name`. */
  const itemRow = (name: string) => {
    const row = screen.getByText(name).closest("button")?.parentElement;
    if (!row) throw new Error(`no library row for "${name}"`);
    return within(row);
  };
  /** The chips under the section headed `heading` in the create form. */
  const section = (heading: string) => {
    const block = screen.getByText(heading).parentElement;
    if (!block) throw new Error(`no section "${heading}"`);
    return within(block);
  };
  return { props, itemRow, section, ...view };
}

describe("LibraryModal · browsing", () => {
  it("shows the title and each exercise with its muscles, tracking and equipment", () => {
    setup();
    expect(screen.getByText("Add an exercise")).toBeInTheDocument();
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Chest, Triceps · Weight & reps · Barbell")).toBeInTheDocument();
    expect(screen.getByText("Quads, Glutes · Weight & reps · Kettlebell")).toBeInTheDocument();
  });

  it("reflects the current search and reports what is typed", () => {
    const { props } = setup({ search: "ben" });
    const box = screen.getByRole("searchbox");
    expect(box).toHaveValue("ben");
    fireEvent.change(box, { target: { value: "bench" } });
    expect(props.onSearch).toHaveBeenCalledWith("bench");
  });

  it("marks the active group filter and reports a newly chosen one", () => {
    const { props } = setup();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Quads" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Quads" }));
    expect(props.onGroup).toHaveBeenCalledWith("Quads");
  });

  it("picking an exercise reports its id", () => {
    const { props, itemRow } = setup();
    fireEvent.click(itemRow("Goblet Squat").getByRole("button", { name: "add" }));
    expect(props.onPick).toHaveBeenCalledTimes(1);
    expect(props.onPick).toHaveBeenCalledWith("my-squat");
    expect(props.onCopy).not.toHaveBeenCalled();
  });

  it("any exercise can be duplicated into a custom one", () => {
    const { props, itemRow } = setup();
    fireEvent.click(itemRow("Bench Press").getByRole("button", { name: "duplicate" }));
    expect(props.onCopy).toHaveBeenCalledWith("bench");
    expect(props.onPick).not.toHaveBeenCalled();
  });

  it("only custom exercises are badged and can be deleted", () => {
    const { props, itemRow } = setup();
    expect(itemRow("Bench Press").queryByRole("button", { name: "delete" })).toBeNull();
    expect(itemRow("Bench Press").queryByText("CUSTOM")).toBeNull();
    expect(itemRow("Goblet Squat").getByText("CUSTOM")).toBeInTheDocument();

    fireEvent.click(itemRow("Goblet Squat").getByRole("button", { name: "delete" }));
    expect(props.onDeleteCustom).toHaveBeenCalledWith("my-squat");
    expect(props.onPick).not.toHaveBeenCalled();
  });

  it("shows the empty message when nothing matches", () => {
    setup({ items: [], search: "zzz" });
    expect(screen.getByText("No exercises match.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "add" })).toBeNull();
  });

  it("the ✕ closes the library", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  // Suspected source bug (packages/B22-modals/src/library-modal.ts, ~lines 321–342):
  // the dashed "create a custom exercise" button under the list is rendered with
  // no children and no aria-label — the refactor dropped the old `createLabel`
  // prop ("Create a custom exercise" in the design) without replacing its text —
  // so the button is blank on screen and has no accessible name.
  it.fails("offers a labelled way to create a custom exercise", () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(props.onStartCreate).toHaveBeenCalledTimes(1);
  });
});

describe("LibraryModal · creating a custom exercise", () => {
  const creating = (over: Partial<LibraryModalProps> = {}) =>
    setup({ creating: true, draftName: "Goblet Squat", primaryChips: chips(["quads"]), ...over });

  it("replaces the list and search with the form", () => {
    creating();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByText("Bench Press")).toBeNull();
    expect(screen.getByPlaceholderText("Exercise name")).toHaveValue("Goblet Squat");
  });

  it("reports edits to the name", () => {
    const { props } = creating();
    fireEvent.change(screen.getByPlaceholderText("Exercise name"), {
      target: { value: "Goblet Squat (pause)" },
    });
    expect(props.onDraftName).toHaveBeenCalledWith("Goblet Squat (pause)");
  });

  it("toggles primary and secondary muscles independently", () => {
    const { props, section } = creating();
    const primary = section("PRIMARY MUSCLES");
    const secondary = section("SECONDARY MUSCLES");
    expect(primary.getByRole("button", { name: "Quads" })).toHaveAttribute("aria-pressed", "true");
    expect(secondary.getByRole("button", { name: "Quads" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(primary.getByRole("button", { name: "Glutes" }));
    expect(props.onTogglePrimary).toHaveBeenCalledWith("glutes");
    expect(props.onToggleSecondary).not.toHaveBeenCalled();

    fireEvent.click(secondary.getByRole("button", { name: "Chest" }));
    expect(props.onToggleSecondary).toHaveBeenCalledWith("chest");
    expect(props.onTogglePrimary).toHaveBeenCalledTimes(1);
  });

  it("shows how the exercise is tracked and reports a new choice", () => {
    const { props } = creating();
    const trigger = screen.getByRole("button", { name: "HOW TO TRACK IT" });
    expect(trigger).toHaveTextContent("Weight & reps");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Reps only" }));
    expect(props.onDraftTrack).toHaveBeenCalledWith("reps_only");
    expect(props.onDraftEquip).not.toHaveBeenCalled();
  });

  it("shows the equipment and reports a new choice", () => {
    const { props } = creating();
    const trigger = screen.getByRole("button", { name: "EQUIPMENT" });
    expect(trigger).toHaveTextContent("Dumbbells");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Kettlebell" }));
    expect(props.onDraftEquip).toHaveBeenCalledWith("kettlebell");
  });

  it("Create is available once a primary muscle is chosen", () => {
    const { props } = creating();
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it("Create is disabled until a primary muscle is chosen", () => {
    const { props } = creating({ primaryChips: chips([]), secondaryChips: chips(["glutes"]) });
    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeDisabled();
    fireEvent.click(create);
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it("Back returns to browsing without creating", () => {
    const { props } = creating();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(props.onCancelCreate).toHaveBeenCalledTimes(1);
    expect(props.onCreate).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
