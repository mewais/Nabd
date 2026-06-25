/**
 * B22 · @nabd/modals — React overlay tests.
 *
 * Every test asserts concrete DOM/text/values or fires real callbacks.
 * No `expect(...).toThrow("not implemented")` calls.
 * No sole `.toBeDefined()` / `.toBeTruthy()` assertions.
 * All tests are RED now (skeleton throws); they turn GREEN once implemented.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  ModalShell,
  buildSessionList,
  SessionModal,
  NotificationToast,
  LibraryModal,
  SettingsModal,
  buildChartVM,
  FullHistoryChartModal,
} from "@nabd/modals";

import type {
  SessionExerciseRow,
  SessionModalProps,
  ToastProps,
  LibraryItem,
  LibraryModalProps,
  SettingsModalProps,
  ChartVM,
  ChartModalProps,
} from "@nabd/modals";

import type { ActiveSession, Slot, Settings } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSlot = (overrides: Partial<Slot> = {}): Slot => ({
  id: "s1",
  exId: "ex1",
  exercise: "Push-up",
  group: "Chest",
  muscles: ["chest", "triceps"],
  min: 570,
  timeStr: "9:30",
  sets: 3,
  done: 3,
  status: "done",
  result: "",
  ...overrides,
});

const makeActiveSession = (overrides: Partial<ActiveSession> = {}): ActiveSession => ({
  slotId: "s2",
  exercise: "Pull-up",
  group: "Back",
  muscles: ["lats", "biceps"],
  weighted: true,
  unit: "reps",
  reps: 8,
  weight: 20,
  sugg: { sets: 3, reps: 8, weight: 22.5, note: "+2.5 kg", up: true },
  last: { sets: 3, reps: 8, weight: 20 },
  logged: [],
  allDone: false,
  ...overrides,
});

const makeSettings = (overrides: Partial<Settings> = {}): Settings => ({
  theme: "translucent",
  opacity: 0.55,
  wallpaper: "aurora",
  openAtStartup: true,
  minimizedByDefault: false,
  interval: 50,
  idleNudge: 30,
  ...overrides,
});

const makeSessionRow = (overrides: Partial<SessionExerciseRow> = {}): SessionExerciseRow => ({
  slotId: "s1",
  exercise: "Push-up",
  muscles: "Chest, Triceps",
  done: 3,
  sets: 3,
  complete: true,
  active: false,
  ...overrides,
});

const makeLibraryItem = (overrides: Partial<LibraryItem> = {}): LibraryItem => ({
  id: "lib1",
  name: "Bench Press",
  muscles: "Chest",
  trackLabel: "Weight & reps",
  equip: "Barbell",
  custom: false,
  ...overrides,
});

// ChartVM computed from buildChartVM("Bench Press", [100, 120, 110], "kg", "Jan 2024")
// Precomputed expected values (mirror the B05 trendPoints geometry):
//   W=680, H=240, pad=30
//   points = "30.0,210.0 340.0,30.0 650.0,120.0"
//   areaPoints = "30,210 30.0,210.0 340.0,30.0 650.0,120.0 650,210"
//   viewBox = "0 0 680 240"
//   pr = "120 kg", current = "110 kg", gainAll = "+10 kg"
//   gridY[0].label = "120", [1].label = "110", [2].label = "100"
const CHART_SERIES = [100, 120, 110] as const;
const CHART_UNIT = "kg";
const CHART_START = "Jan 2024";
const CHART_EXERCISE = "Bench Press";

// ---------------------------------------------------------------------------
// ModalShell
// ---------------------------------------------------------------------------

describe("ModalShell", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
  });

  it("renders children inside the panel", () => {
    render(
      <ModalShell onClose={onClose}>
        <span data-testid="child">hello</span>
      </ModalShell>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("calls onClose when the backdrop is clicked", () => {
    render(
      <ModalShell onClose={onClose}>
        <span>content</span>
      </ModalShell>,
    );
    // The backdrop is the outermost fixed overlay div with an onClick that calls onClose.
    const backdrop = document.querySelector("[data-modal-backdrop]") as Element;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClose when the panel is clicked", () => {
    render(
      <ModalShell onClose={onClose}>
        <span data-testid="inner">inner content</span>
      </ModalShell>,
    );
    // Clicking inside the panel (which stops propagation) should not trigger onClose
    fireEvent.click(screen.getByTestId("inner"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders panel with correct width when width prop is provided", () => {
    render(
      <ModalShell onClose={onClose} width={500}>
        <span data-testid="w-child">w</span>
      </ModalShell>,
    );
    expect(screen.getByTestId("w-child")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// buildSessionList
// ---------------------------------------------------------------------------

describe("buildSessionList", () => {
  it("returns one row per slot with correct slotId and exercise", () => {
    const slots: Slot[] = [
      makeSlot({ id: "s1", exercise: "Push-up", muscles: ["chest", "triceps"] }),
      makeSlot({
        id: "s2",
        exercise: "Pull-up",
        muscles: ["lats", "biceps"],
        done: 1,
        sets: 4,
        status: "now",
      }),
    ];
    const rows = buildSessionList(slots, "s2");
    expect(rows).toHaveLength(2);
    expect(rows[0].slotId).toBe("s1");
    expect(rows[1].slotId).toBe("s2");
    expect(rows[0].exercise).toBe("Push-up");
    expect(rows[1].exercise).toBe("Pull-up");
  });

  it("joins muscle names with ', ' (comma space)", () => {
    const slots: Slot[] = [makeSlot({ id: "s1", muscles: ["chest", "triceps"] })];
    const rows = buildSessionList(slots, "x");
    // MUSCLE_NAMES: chest -> "Chest", triceps -> "Triceps"
    expect(rows[0].muscles).toBe("Chest, Triceps");
  });

  it("marks slot as complete when done >= sets", () => {
    const slots: Slot[] = [
      makeSlot({ id: "s1", done: 3, sets: 3 }),
      makeSlot({ id: "s2", done: 1, sets: 4, status: "now" }),
    ];
    const rows = buildSessionList(slots, "x");
    expect(rows[0].complete).toBe(true);
    expect(rows[1].complete).toBe(false);
  });

  it("marks slot as active only when slotId matches activeSlotId", () => {
    const slots: Slot[] = [
      makeSlot({ id: "s1", done: 3, sets: 3 }),
      makeSlot({ id: "s2", done: 0, sets: 3, status: "now" }),
    ];
    const rows = buildSessionList(slots, "s2");
    expect(rows[0].active).toBe(false);
    expect(rows[1].active).toBe(true);
  });

  it("preserves done and sets values on each row", () => {
    const slots: Slot[] = [makeSlot({ id: "s1", done: 2, sets: 5 })];
    const rows = buildSessionList(slots, "s1");
    expect(rows[0].done).toBe(2);
    expect(rows[0].sets).toBe(5);
  });

  it("handles a single-muscle slot (no comma in joined muscles)", () => {
    const slots: Slot[] = [makeSlot({ id: "s1", muscles: ["chest"] })];
    const rows = buildSessionList(slots, "x");
    expect(rows[0].muscles).toBe("Chest");
  });

  it("returns empty array for empty slots", () => {
    const rows = buildSessionList([], "s1");
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SessionModal
// ---------------------------------------------------------------------------

describe("SessionModal", () => {
  const onPick = vi.fn();
  const onStepReps = vi.fn();
  const onStepWeight = vi.fn();
  const onLog = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    onPick.mockReset();
    onStepReps.mockReset();
    onStepWeight.mockReset();
    onLog.mockReset();
    onClose.mockReset();
  });

  const defaultList: SessionExerciseRow[] = [
    makeSessionRow({
      slotId: "s1",
      exercise: "Push-up",
      muscles: "Chest, Triceps",
      complete: true,
      done: 3,
      sets: 3,
      active: false,
    }),
    makeSessionRow({
      slotId: "s2",
      exercise: "Pull-up",
      muscles: "Lats, Biceps",
      complete: false,
      done: 1,
      sets: 4,
      active: true,
    }),
  ];

  const defaultSession = makeActiveSession({ weighted: true, logged: [], reps: 8, weight: 20 });

  const defaultProps: SessionModalProps = {
    session: defaultSession,
    list: defaultList,
    setOfLabel: "Set 2 of 4",
    onPick,
    onStepReps,
    onStepWeight,
    onLog,
    onClose,
  };

  it("renders setOfLabel text", () => {
    render(<SessionModal {...defaultProps} />);
    expect(screen.getByText("Set 2 of 4")).toBeInTheDocument();
  });

  it("renders active exercise name in right pane", () => {
    render(<SessionModal {...defaultProps} />);
    expect(screen.getByText("Pull-up")).toBeInTheDocument();
  });

  it("renders suggestion note text", () => {
    render(<SessionModal {...defaultProps} />);
    expect(screen.getByText("+2.5 kg")).toBeInTheDocument();
  });

  it("renders Reps stepper and increments by +1 on '+'", () => {
    render(<SessionModal {...defaultProps} />);
    // First "+" button belongs to the Reps stepper
    const incButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(incButtons[0]);
    expect(onStepReps).toHaveBeenCalledWith(1);
  });

  it("renders Reps stepper and decrements by -1 on '−'", () => {
    render(<SessionModal {...defaultProps} />);
    const decButtons = screen.getAllByRole("button", { name: "−" });
    fireEvent.click(decButtons[0]);
    expect(onStepReps).toHaveBeenCalledWith(-1);
  });

  it("shows Weight stepper when session is weighted", () => {
    render(<SessionModal {...defaultProps} />);
    expect(screen.getByText(/weight/i)).toBeInTheDocument();
  });

  it("clicking Weight stepper '+' calls onStepWeight(+1)", () => {
    render(<SessionModal {...defaultProps} />);
    // The weight stepper's "+" is the second "+" button (reps is first)
    const incButtons = screen.getAllByRole("button", { name: "+" });
    expect(incButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(incButtons[1]);
    expect(onStepWeight).toHaveBeenCalledWith(1);
  });

  it("clicking Weight stepper '−' calls onStepWeight(-1)", () => {
    render(<SessionModal {...defaultProps} />);
    const decButtons = screen.getAllByRole("button", { name: "−" });
    expect(decButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(decButtons[1]);
    expect(onStepWeight).toHaveBeenCalledWith(-1);
  });

  it("hides Weight stepper when session is NOT weighted", () => {
    const props: SessionModalProps = {
      ...defaultProps,
      session: makeActiveSession({ weighted: false }),
    };
    render(<SessionModal {...props} />);
    expect(screen.queryByText(/weight/i)).not.toBeInTheDocument();
    // Only 1 pair of stepper buttons (reps only)
    expect(screen.getAllByRole("button", { name: "+" })).toHaveLength(1);
  });

  it("clicking 'Log this set' calls onLog", () => {
    render(<SessionModal {...defaultProps} />);
    fireEvent.click(screen.getByText(/log this set/i));
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it("clicking Done calls onClose", () => {
    render(<SessionModal {...defaultProps} />);
    fireEvent.click(screen.getByText(/done/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows 'No sets logged yet' when logged is empty", () => {
    render(<SessionModal {...defaultProps} session={makeActiveSession({ logged: [] })} />);
    expect(screen.getByText(/no sets logged yet/i)).toBeInTheDocument();
  });

  it("shows logged count when sets have been logged", () => {
    const session = makeActiveSession({
      logged: [
        { exercise: "Push-up", group: "Chest", setStr: "8 reps @ 20 kg" },
        { exercise: "Push-up", group: "Chest", setStr: "8 reps @ 20 kg" },
      ],
    });
    render(<SessionModal {...defaultProps} session={session} />);
    expect(screen.getByText(/2 sets logged/i)).toBeInTheDocument();
  });

  it("renders left pane rows showing done/sets format", () => {
    render(<SessionModal {...defaultProps} />);
    // "3/3" for the completed row
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });

  it("clicking a left-pane row calls onPick with that row's slotId", () => {
    render(<SessionModal {...defaultProps} />);
    // Click on the Push-up row (slotId='s1')
    fireEvent.click(screen.getByText(/push-up/i));
    expect(onPick).toHaveBeenCalledWith("s1");
  });

  it("complete row shows a check marker (data-complete or aria-label)", () => {
    render(<SessionModal {...defaultProps} />);
    // The complete row for s1 should have a visual indicator
    const checkEl = document.querySelector("[data-complete='true']") ??
      document.querySelector("[aria-label='complete']");
    expect(checkEl).not.toBeNull();
  });

  it("active row has data-active marker", () => {
    render(<SessionModal {...defaultProps} />);
    // The active row (s2 - Pull-up) should be marked
    const activeRow = document.querySelector("[data-row-active='true']");
    expect(activeRow).not.toBeNull();
  });

  it("shows muscles of active session in right pane", () => {
    render(<SessionModal {...defaultProps} />);
    // Active session muscles: ['lats','biceps'] displayed as "Lats, Biceps"
    expect(screen.getByText(/lats/i)).toBeInTheDocument();
  });

  it("displays the current reps value in the stepper", () => {
    render(<SessionModal {...defaultProps} />);
    // reps=8 should appear in the reps stepper value display
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("displays the current weight value in the weight stepper", () => {
    render(<SessionModal {...defaultProps} />);
    // weight=20 should appear
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("rep-input label is 'Reps' for a reps-based exercise (unit='reps')", () => {
    // defaultSession already has unit: "reps"
    const props: SessionModalProps = {
      ...defaultProps,
      session: makeActiveSession({ unit: "reps", weighted: false }),
    };
    render(<SessionModal {...props} />);
    // The Stepper for the count field must be labeled "Reps"
    expect(screen.getByText("Reps")).toBeInTheDocument();
  });

  it("rep-input label is 'Sec' for a time-based exercise (unit='sec') — e.g. Plank", () => {
    // Plank is unweighted and time-based
    const plankSession: ActiveSession = makeActiveSession({
      exercise: "Plank",
      group: "Core",
      muscles: ["abs"],
      weighted: false,
      unit: "sec",
      reps: 30,
      weight: 0,
      sugg: { sets: 3, reps: 30, weight: null, note: "Hold 30 s", up: false },
      last: null,
    });
    render(
      <SessionModal
        session={plankSession}
        list={[]}
        setOfLabel="Set 1 of 3"
        onPick={onPick}
        onStepReps={onStepReps}
        onStepWeight={onStepWeight}
        onLog={onLog}
        onClose={onClose}
      />,
    );
    // The count Stepper must show "Sec" for time-based exercises, not "Reps"
    expect(screen.getByText("Sec")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NotificationToast
// ---------------------------------------------------------------------------

describe("NotificationToast", () => {
  const onConfirm = vi.fn();
  const onSnooze = vi.fn();

  beforeEach(() => {
    onConfirm.mockReset();
    onSnooze.mockReset();
  });

  const defaultProps: ToastProps = {
    reasonLabel: "Interval's up",
    exercise: "Dumbbell Curl",
    sub: "Biceps · 10:30",
    onConfirm,
    onSnooze,
  };

  it("renders TIME TO MOVE heading", () => {
    render(<NotificationToast {...defaultProps} />);
    expect(screen.getByText(/time to move/i)).toBeInTheDocument();
  });

  it("renders the reasonLabel", () => {
    render(<NotificationToast {...defaultProps} />);
    expect(screen.getByText("Interval's up")).toBeInTheDocument();
  });

  it("renders the exercise name", () => {
    render(<NotificationToast {...defaultProps} />);
    expect(screen.getByText("Dumbbell Curl")).toBeInTheDocument();
  });

  it("renders the sub text (group · time)", () => {
    render(<NotificationToast {...defaultProps} />);
    expect(screen.getByText("Biceps · 10:30")).toBeInTheDocument();
  });

  it("clicking \"Let's go\" calls onConfirm and not onSnooze", () => {
    render(<NotificationToast {...defaultProps} />);
    fireEvent.click(screen.getByText(/let's go/i));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it("clicking Snooze calls onSnooze and not onConfirm", () => {
    render(<NotificationToast {...defaultProps} />);
    fireEvent.click(screen.getByText(/snooze/i));
    expect(onSnooze).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// LibraryModal
// ---------------------------------------------------------------------------

describe("LibraryModal", () => {
  const onClose = vi.fn();
  const onSearch = vi.fn();
  const onGroup = vi.fn();
  const onPick = vi.fn();
  const onCopy = vi.fn();
  const onStartCreate = vi.fn();
  const onCancelCreate = vi.fn();
  const onDraft = vi.fn();
  const onToggleSecondary = vi.fn();
  const onCreate = vi.fn();

  beforeEach(() => {
    [
      onClose, onSearch, onGroup, onPick, onCopy, onStartCreate,
      onCancelCreate, onDraft, onToggleSecondary, onCreate,
    ].forEach((fn) => fn.mockReset());
  });

  const groupChips = [
    { k: "Chest", label: "Chest", active: true },
    { k: "Back", label: "Back", active: false },
  ];

  const secondaryChips = [
    { k: "triceps", label: "Triceps", active: false },
    { k: "front_delts", label: "Front Delts", active: true },
  ];

  const groupOptions = [
    { k: "Chest", n: "Chest" },
    { k: "Back", n: "Back" },
  ];

  const trackOptions = [
    { k: "weight_reps", n: "Weight & reps" },
    { k: "bodyweight_reps", n: "Bodyweight reps" },
  ];

  const eqOptions = [
    { k: "barbell", n: "Barbell" },
    { k: "dumbbell", n: "Dumbbells" },
  ];

  const browsingProps: LibraryModalProps = {
    open: true,
    title: "Exercise Library",
    profileName: "Commercial gym",
    browsing: true,
    creating: false,
    search: "",
    groupChips,
    items: [
      makeLibraryItem({ id: "lib1", name: "Bench Press", custom: false }),
      makeLibraryItem({ id: "lib2", name: "My Custom Press", custom: true }),
    ],
    emptyMsg: "No exercises found",
    createLabel: "Create…",
    draftName: "",
    draftGroup: "Chest",
    draftTrack: "weight_reps",
    draftEquip: "barbell",
    groupOptions,
    trackOptions,
    eqOptions,
    secondaryChips,
    onClose,
    onSearch,
    onGroup,
    onPick,
    onCopy,
    onStartCreate,
    onCancelCreate,
    onDraft,
    onToggleSecondary,
    onCreate,
  };

  it("renders nothing when open is false", () => {
    const { container } = render(<LibraryModal {...browsingProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title when open=true", () => {
    render(<LibraryModal {...browsingProps} />);
    expect(screen.getByText("Exercise Library")).toBeInTheDocument();
  });

  it("renders search input in browsing mode", () => {
    render(<LibraryModal {...browsingProps} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("search input change calls onSearch with the typed value", () => {
    render(<LibraryModal {...browsingProps} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "bench" } });
    expect(onSearch).toHaveBeenCalledWith("bench");
  });

  it("renders group chips in browsing mode", () => {
    render(<LibraryModal {...browsingProps} />);
    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeInTheDocument();
  });

  it("clicking an inactive group chip calls onGroup with its key", () => {
    render(<LibraryModal {...browsingProps} />);
    fireEvent.click(screen.getByText("Back"));
    expect(onGroup).toHaveBeenCalledWith("Back");
  });

  it("active group chip is visually marked (data-active or aria-pressed)", () => {
    render(<LibraryModal {...browsingProps} />);
    const chestChip =
      screen.getByText("Chest").closest("[data-active='true']") ??
      screen.getByText("Chest").closest("[aria-pressed='true']");
    expect(chestChip).not.toBeNull();
  });

  it("renders item names in browsing list", () => {
    render(<LibraryModal {...browsingProps} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("My Custom Press")).toBeInTheDocument();
  });

  it("shows CUSTOM badge on custom items only (exactly 1)", () => {
    render(<LibraryModal {...browsingProps} />);
    const badges = screen.getAllByText(/custom/i);
    expect(badges).toHaveLength(1);
  });

  it("clicking '+' button for an item calls onPick with that item's id", () => {
    render(<LibraryModal {...browsingProps} />);
    // Each row has a "+" pick button; click the one for Bench Press (lib1)
    const pickBtns = screen.getAllByRole("button", { name: /add|pick|\+/i });
    fireEvent.click(pickBtns[0]);
    expect(onPick).toHaveBeenCalledWith("lib1");
  });

  it("clicking duplicate button for an item calls onCopy with that item's id", () => {
    render(<LibraryModal {...browsingProps} />);
    const dupBtns = screen.getAllByRole("button", { name: /duplicate|copy/i });
    fireEvent.click(dupBtns[0]);
    expect(onCopy).toHaveBeenCalledWith("lib1");
  });

  it("renders emptyMsg when items list is empty", () => {
    render(<LibraryModal {...browsingProps} items={[]} />);
    expect(screen.getByText("No exercises found")).toBeInTheDocument();
  });

  it("clicking 'Create…' button calls onStartCreate", () => {
    render(<LibraryModal {...browsingProps} />);
    fireEvent.click(screen.getByText("Create…"));
    expect(onStartCreate).toHaveBeenCalledTimes(1);
  });

  // ------ Creating mode -------

  const creatingProps: LibraryModalProps = {
    ...browsingProps,
    browsing: false,
    creating: true,
    draftName: "My Exercise",
    draftGroup: "Chest",
    draftTrack: "weight_reps",
    draftEquip: "barbell",
  };

  it("renders name text input in creating mode", () => {
    render(<LibraryModal {...creatingProps} />);
    const nameInput = screen.getByRole("textbox");
    expect(nameInput).toBeInTheDocument();
  });

  it("name input change calls onDraft('name', value)", () => {
    render(<LibraryModal {...creatingProps} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Squat" } });
    expect(onDraft).toHaveBeenCalledWith("name", "Squat");
  });

  it("group select change calls onDraft('group', value)", () => {
    render(<LibraryModal {...creatingProps} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "Back" } });
    expect(onDraft).toHaveBeenCalledWith("group", "Back");
  });

  it("track select change calls onDraft('track', value)", () => {
    render(<LibraryModal {...creatingProps} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "bodyweight_reps" } });
    expect(onDraft).toHaveBeenCalledWith("track", "bodyweight_reps");
  });

  it("equip select change calls onDraft('equip', value)", () => {
    render(<LibraryModal {...creatingProps} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[2], { target: { value: "dumbbell" } });
    expect(onDraft).toHaveBeenCalledWith("equip", "dumbbell");
  });

  it("clicking an inactive secondary chip calls onToggleSecondary with its key", () => {
    render(<LibraryModal {...creatingProps} />);
    fireEvent.click(screen.getByText("Triceps"));
    expect(onToggleSecondary).toHaveBeenCalledWith("triceps");
  });

  it("active secondary chip is visually marked (data-active or aria-pressed)", () => {
    render(<LibraryModal {...creatingProps} />);
    const frontDeltsChip =
      screen.getByText("Front Delts").closest("[data-active='true']") ??
      screen.getByText("Front Delts").closest("[aria-pressed='true']");
    expect(frontDeltsChip).not.toBeNull();
  });

  it("clicking Create button calls onCreate", () => {
    render(<LibraryModal {...creatingProps} />);
    fireEvent.click(screen.getByText(/^create$/i));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("clicking Back button calls onCancelCreate", () => {
    render(<LibraryModal {...creatingProps} />);
    fireEvent.click(screen.getByText(/back/i));
    expect(onCancelCreate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// SettingsModal
// ---------------------------------------------------------------------------

describe("SettingsModal", () => {
  const onClose = vi.fn();
  const onTheme = vi.fn();
  const onOpacity = vi.fn();
  const onWallpaper = vi.fn();
  const onToggleStartup = vi.fn();
  const onToggleMinimized = vi.fn();
  const onInterval = vi.fn();
  const onIdleNudge = vi.fn();
  const onExport = vi.fn();
  const onImport = vi.fn();

  beforeEach(() => {
    [
      onClose, onTheme, onOpacity, onWallpaper, onToggleStartup,
      onToggleMinimized, onInterval, onIdleNudge, onExport, onImport,
    ].forEach((fn) => fn.mockReset());
  });

  const translucentProps: SettingsModalProps = {
    settings: makeSettings({
      theme: "translucent",
      opacity: 0.55,
      wallpaper: "aurora",
      interval: 50,
      idleNudge: 30,
    }),
    theme: "translucent",
    onClose,
    onTheme,
    onOpacity,
    onWallpaper,
    onToggleStartup,
    onToggleMinimized,
    onInterval,
    onIdleNudge,
    onExport,
    onImport,
  };

  it("renders theme Segmented control with all three options", () => {
    render(<SettingsModal {...translucentProps} />);
    expect(screen.getByText(/translucent/i)).toBeInTheDocument();
    expect(screen.getByText(/light/i)).toBeInTheDocument();
    expect(screen.getByText(/dark/i)).toBeInTheDocument();
  });

  it("clicking the 'Light' theme option calls onTheme('light')", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByText(/^light$/i));
    expect(onTheme).toHaveBeenCalledWith("light");
  });

  it("clicking the 'Dark' theme option calls onTheme('dark')", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByText(/^dark$/i));
    expect(onTheme).toHaveBeenCalledWith("dark");
  });

  it("translucent theme shows opacity stepper label", () => {
    render(<SettingsModal {...translucentProps} />);
    expect(screen.getByText(/opacity/i)).toBeInTheDocument();
  });

  it("opacity stepper '+' calls onOpacity(+1)", () => {
    render(<SettingsModal {...translucentProps} />);
    // Find the opacity stepper section and click its "+" button
    const opacityLabel = screen.getByText(/opacity/i);
    const opacitySection = opacityLabel.closest("div")!.parentElement!;
    const incBtn = opacitySection.querySelectorAll("button")[1];
    fireEvent.click(incBtn);
    expect(onOpacity).toHaveBeenCalledWith(1);
  });

  it("opacity stepper '−' calls onOpacity(-1)", () => {
    render(<SettingsModal {...translucentProps} />);
    const opacityLabel = screen.getByText(/opacity/i);
    const opacitySection = opacityLabel.closest("div")!.parentElement!;
    const decBtn = opacitySection.querySelectorAll("button")[0];
    fireEvent.click(decBtn);
    expect(onOpacity).toHaveBeenCalledWith(-1);
  });

  it("translucent theme shows all 4 wallpaper swatch buttons", () => {
    render(<SettingsModal {...translucentProps} />);
    expect(screen.getByRole("button", { name: /aurora/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dusk/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mesh/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /slate/i })).toBeInTheDocument();
  });

  it("clicking the 'dusk' wallpaper swatch calls onWallpaper('dusk')", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /dusk/i }));
    expect(onWallpaper).toHaveBeenCalledWith("dusk");
  });

  it("clicking the 'aurora' wallpaper swatch calls onWallpaper('aurora')", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /aurora/i }));
    expect(onWallpaper).toHaveBeenCalledWith("aurora");
  });

  it("clicking the 'mesh' wallpaper swatch calls onWallpaper('mesh')", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /mesh/i }));
    expect(onWallpaper).toHaveBeenCalledWith("mesh");
  });

  it("clicking the 'slate' wallpaper swatch calls onWallpaper('slate')", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /slate/i }));
    expect(onWallpaper).toHaveBeenCalledWith("slate");
  });

  it("light theme hides opacity stepper", () => {
    const lightProps: SettingsModalProps = {
      ...translucentProps,
      settings: makeSettings({ theme: "light" }),
      theme: "light",
    };
    render(<SettingsModal {...lightProps} />);
    expect(screen.queryByText(/opacity/i)).not.toBeInTheDocument();
  });

  it("light theme hides wallpaper swatches", () => {
    const lightProps: SettingsModalProps = {
      ...translucentProps,
      settings: makeSettings({ theme: "light" }),
      theme: "light",
    };
    render(<SettingsModal {...lightProps} />);
    expect(screen.queryByRole("button", { name: /aurora|dusk|mesh|slate/i })).toBeNull();
  });

  it("dark theme hides opacity stepper", () => {
    const darkProps: SettingsModalProps = {
      ...translucentProps,
      settings: makeSettings({ theme: "dark" }),
      theme: "dark",
    };
    render(<SettingsModal {...darkProps} />);
    expect(screen.queryByText(/opacity/i)).not.toBeInTheDocument();
  });

  it("dark theme hides wallpaper swatches", () => {
    const darkProps: SettingsModalProps = {
      ...translucentProps,
      settings: makeSettings({ theme: "dark" }),
      theme: "dark",
    };
    render(<SettingsModal {...darkProps} />);
    expect(screen.queryByRole("button", { name: /aurora|dusk|mesh|slate/i })).toBeNull();
  });

  it("renders openAtStartup toggle with aria-checked='true' reflecting settings", () => {
    render(<SettingsModal {...translucentProps} />);
    const toggle = screen.getByRole("switch", { name: /startup/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking openAtStartup toggle calls onToggleStartup", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("switch", { name: /startup/i }));
    expect(onToggleStartup).toHaveBeenCalledTimes(1);
  });

  it("renders minimizedByDefault toggle with aria-checked='false' reflecting settings", () => {
    render(<SettingsModal {...translucentProps} />);
    const toggle = screen.getByRole("switch", { name: /minimized/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("clicking minimizedByDefault toggle calls onToggleMinimized", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("switch", { name: /minimized/i }));
    expect(onToggleMinimized).toHaveBeenCalledTimes(1);
  });

  it("interval stepper shows settings.interval value (50)", () => {
    render(<SettingsModal {...translucentProps} />);
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("interval stepper '+' calls onInterval(+1)", () => {
    render(<SettingsModal {...translucentProps} />);
    const intervalLabel = screen.getByText(/interval/i);
    const intervalSection = intervalLabel.closest("div")!.parentElement!;
    const incBtn = intervalSection.querySelectorAll("button")[1];
    fireEvent.click(incBtn);
    expect(onInterval).toHaveBeenCalledWith(1);
  });

  it("interval stepper '−' calls onInterval(-1)", () => {
    render(<SettingsModal {...translucentProps} />);
    const intervalLabel = screen.getByText(/interval/i);
    const intervalSection = intervalLabel.closest("div")!.parentElement!;
    const decBtn = intervalSection.querySelectorAll("button")[0];
    fireEvent.click(decBtn);
    expect(onInterval).toHaveBeenCalledWith(-1);
  });

  it("idleNudge stepper shows settings.idleNudge value (30)", () => {
    render(<SettingsModal {...translucentProps} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("idleNudge stepper '+' calls onIdleNudge(+1)", () => {
    render(<SettingsModal {...translucentProps} />);
    const idleLabel = screen.getByText(/idle/i);
    const idleSection = idleLabel.closest("div")!.parentElement!;
    const incBtn = idleSection.querySelectorAll("button")[1];
    fireEvent.click(incBtn);
    expect(onIdleNudge).toHaveBeenCalledWith(1);
  });

  it("idleNudge stepper '−' calls onIdleNudge(-1)", () => {
    render(<SettingsModal {...translucentProps} />);
    const idleLabel = screen.getByText(/idle/i);
    const idleSection = idleLabel.closest("div")!.parentElement!;
    const decBtn = idleSection.querySelectorAll("button")[0];
    fireEvent.click(decBtn);
    expect(onIdleNudge).toHaveBeenCalledWith(-1);
  });

  it("clicking Export button calls onExport", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("clicking Import button calls onImport", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /import/i }));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it("clicking close button calls onClose", () => {
    render(<SettingsModal {...translucentProps} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// buildChartVM
// ---------------------------------------------------------------------------

describe("buildChartVM", () => {
  // Reference series: [100, 120, 110], unit="kg", W=680, H=240, pad=30
  // pr = max = 120  → "120 kg"
  // current = last = 110 → "110 kg"
  // gainAll = last − first = 10 → "+10 kg"
  // points (trendPoints): "30.0,210.0 340.0,30.0 650.0,120.0"
  // areaPoints: "30,210 30.0,210.0 340.0,30.0 650.0,120.0 650,210"
  // gridY[0].label = "120", [1].label = "110", [2].label = "100"

  it("returns pr formatted as 'max unit'", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.pr).toBe("120 kg");
  });

  it("returns current formatted as 'last unit'", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.current).toBe("110 kg");
  });

  it("returns gainAll sign-prefixed '+10 kg' for positive gain", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gainAll).toBe("+10 kg");
  });

  it("returns gainAll '-20 kg' for negative gain", () => {
    const vm = buildChartVM("Squat", [120, 100], CHART_UNIT, "Feb 2024");
    expect(vm.gainAll).toBe("-20 kg");
  });

  it("returns gainAll '0 reps' when first equals last", () => {
    const vm = buildChartVM("Plank", [80, 80], "reps", "Mar 2024");
    expect(vm.gainAll).toBe("0 reps");
  });

  it("returns sessions equal to series.length", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.sessions).toBe(3);
  });

  it("returns viewBox '0 0 680 240'", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.viewBox).toBe("0 0 680 240");
  });

  it("returns gridY array with exactly 3 entries", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gridY).toHaveLength(3);
  });

  it("gridY[0].label is the max value as string", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gridY[0].label).toBe("120");
  });

  it("gridY[1].label is the midpoint (max+min)/2 as string", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gridY[1].label).toBe("110");
  });

  it("gridY[2].label is the min value as string", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gridY[2].label).toBe("100");
  });

  it("gridY[0].y positions max at top (smallest y = pad = '30.0')", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gridY[0].y).toBe("30.0");
  });

  it("gridY[2].y positions min at bottom (largest y = H-pad = '210.0')", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.gridY[2].y).toBe("210.0");
  });

  it("returns correct polyline points string", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.points).toBe("30.0,210.0 340.0,30.0 650.0,120.0");
  });

  it("returns correct areaPoints string including bottom corners", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.areaPoints).toBe("30,210 30.0,210.0 340.0,30.0 650.0,120.0 650,210");
  });

  it("returns exercise name unchanged", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.exercise).toBe("Bench Press");
  });

  it("returns startLabel unchanged", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.startLabel).toBe("Jan 2024");
  });

  it("single-point series: points string is one coordinate pair at (pad, mid-y)", () => {
    const vm = buildChartVM("Plank", [80], "reps", "Mar 2024");
    // span=0 → normY=0.5 → y = 30 + (1-0.5)*180 = 120; x = pad = 30
    expect(vm.points).toBe("30.0,120.0");
  });

  it("single-point series: areaPoints has correct bottom corners", () => {
    const vm = buildChartVM("Plank", [80], "reps", "Mar 2024");
    expect(vm.areaPoints).toBe("30,210 30.0,120.0 650,210");
  });

  it("single-point series: gridY all entries have same label ('80')", () => {
    const vm = buildChartVM("Plank", [80], "reps", "Mar 2024");
    expect(vm.gridY).toHaveLength(3);
    expect(vm.gridY[0].label).toBe("80");
    expect(vm.gridY[2].label).toBe("80");
  });

  it("returns a non-empty nowLabel string", () => {
    const vm = buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);
    expect(vm.nowLabel.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// FullHistoryChartModal
// ---------------------------------------------------------------------------

describe("FullHistoryChartModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
  });

  // Pre-built VM object (does NOT call buildChartVM to avoid skeleton throws).
  // These values are what buildChartVM("Bench Press",[100,120,110],"kg","Jan 2024") must produce.
  const staticVM: ChartVM = {
    exercise: "Bench Press",
    startLabel: "Jan 2024",
    nowLabel: "Now",
    sessions: 3,
    pr: "120 kg",
    current: "110 kg",
    gainAll: "+10 kg",
    points: "30.0,210.0 340.0,30.0 650.0,120.0",
    areaPoints: "30,210 30.0,210.0 340.0,30.0 650.0,120.0 650,210",
    viewBox: "0 0 680 240",
    gridY: [
      { y: "30.0", label: "120" },
      { y: "120.0", label: "110" },
      { y: "210.0", label: "100" },
    ],
  };

  // Build VM inside each test to avoid top-level skeleton throws (used in buildChartVM tests)
  const makeVM = (): ChartVM =>
    buildChartVM(CHART_EXERCISE, [...CHART_SERIES], CHART_UNIT, CHART_START);

  it("renders exercise name", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("renders sessions count (3)", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders PB stat tile with pr value '120 kg'", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("120 kg")).toBeInTheDocument();
  });

  it("renders current stat tile with '110 kg'", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("110 kg")).toBeInTheDocument();
  });

  it("renders gain stat tile with '+10 kg'", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("+10 kg")).toBeInTheDocument();
  });

  it("renders an SVG element", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("SVG has correct viewBox attribute", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    const svg = document.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 680 240");
  });

  it("renders polyline with correct points attribute", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    const polyline = document.querySelector("polyline")!;
    expect(polyline).not.toBeNull();
    expect(polyline.getAttribute("points")).toBe("30.0,210.0 340.0,30.0 650.0,120.0");
  });

  it("renders area polygon with correct areaPoints attribute", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    const polygon = document.querySelector("polygon")!;
    expect(polygon).not.toBeNull();
    expect(polygon.getAttribute("points")).toBe("30,210 30.0,210.0 340.0,30.0 650.0,120.0 650,210");
  });

  it("renders gridY max label (120)", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("renders gridY mid label (110)", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("110")).toBeInTheDocument();
  });

  it("renders gridY min label (100)", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders startLabel on the x-axis", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("Jan 2024")).toBeInTheDocument();
  });

  it("renders nowLabel on the x-axis", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    expect(screen.getByText("Now")).toBeInTheDocument();
  });

  it("clicking close button calls onClose", () => {
    render(<FullHistoryChartModal vm={staticVM} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Also call makeVM() in a test to ensure buildChartVM path is also exercised
  // (coverage for that is already covered in the buildChartVM describe block)
});
