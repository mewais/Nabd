import { describe, expect, it } from "vitest";
import { EMPTY_PROGRAM } from "@nabd/domain";
import type { Prescription, Program } from "@nabd/domain";
import { buildBoard, buildEditor, buildSetBlock } from "@nabd/planner";
import type { EditorRow } from "@nabd/planner";
import {
  BENCH,
  DB_BENCH,
  FIXTURE_EXERCISE_IDS,
  PLANK,
  PUSH_UP,
  cycledProgram,
  dayOf,
  fixedProgram,
  floating,
  library,
} from "./fixtures";

const prescription = (program: Program, dayId: string, rowId: string): Prescription => {
  const row = dayOf(program, dayId).exercises.find((e) => e.id === rowId);
  if (!row) throw new Error(`row ${rowId} missing`);
  return row;
};

/** Narrow an editor row to the names it shows, for compact assertions. */
const rowNames = (row: EditorRow): string | string[] =>
  row.kind === "ex"
    ? row.ex.name
    : row.kind === "superset"
      ? row.members.map((m) => `${m.supersetTag} ${m.name}`)
      : row.slot.muscleName;

describe("fixtures", () => {
  it("only reference exercises that exist in the catalog", () => {
    for (const id of FIXTURE_EXERCISE_IDS) {
      expect(library.byId(id), id).toBeDefined();
    }
  });
});

describe("buildSetBlock", () => {
  it("numbers working sets and letters warm-ups and drop sets", () => {
    const block = buildSetBlock(prescription(fixedProgram(), "d-push", "e-bench"));

    expect(block.rows.map((r) => r.badgeLabel)).toEqual(["W", "1", "2", "D"]);
    expect(block.rows.map((r) => r.badgeKind)).toEqual(["warm", "work", "work", "drop"]);
    expect(block.rows.map((r) => r.typeName)).toEqual([
      "Warm-up",
      "Working",
      "Working",
      "Drop set",
    ]);
    expect(block.rows.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it("shows a rep range with an RPE column", () => {
    const block = buildSetBlock(prescription(fixedProgram(), "d-push", "e-bench"));

    expect(block.repHeader).toBe("REPS");
    expect(block.intHeader).toBe("RPE");
    expect(block.showIntCol).toBe(true);
    expect(block.rows.map((r) => r.repsStr)).toEqual(["10–12", "8–10", "6–8", "12–15"]);
    expect(block.rows.map((r) => r.intStr)).toEqual(["6", "8", "8.5", "9"]);
    expect(block.rows.every((r) => r.hasB && r.showInt && !r.isTime)).toBe(true);
    expect(block.rows[1]).toMatchObject({ repA: 8, repB: 10 });
    expect(block.notes).toBe("Pause on the chest");
  });

  it("shows fixed reps with a %1RM column", () => {
    const block = buildSetBlock(prescription(fixedProgram(), "d-push", "e-ohp"));

    expect(block.intHeader).toBe("%1RM");
    expect(block.rows.map((r) => r.repsStr)).toEqual(["5", "5", "5"]);
    expect(block.rows.map((r) => r.intStr)).toEqual(["70%", "72.5%", "75%"]);
    expect(block.rows.every((r) => !r.hasB && r.repB === null)).toBe(true);
    expect(block.notes).toBe("");
  });

  it("shows seconds and no intensity column for a timed hold", () => {
    const block = buildSetBlock(prescription(fixedProgram(), "d-push", "e-plank"));

    expect(block.repHeader).toBe("TIME");
    expect(block.intHeader).toBe("");
    expect(block.showIntCol).toBe(false);
    expect(block.rows.map((r) => r.repsStr)).toEqual(["45s", "60s"]);
    expect(block.rows.every((r) => r.isTime && !r.showInt && r.intStr === "")).toBe(true);
  });

  it("ignores a leftover range top when reps are fixed, and a leftover value when load is off", () => {
    const block = buildSetBlock({
      repMode: "fixed",
      intensity: "none",
      rest: 60,
      sets: [{ type: "working", a: 12, b: 15, val: 8 }],
    });

    expect(block.rows[0]).toMatchObject({ repsStr: "12", hasB: false, intStr: "" });
  });

  it.each([
    [150, "2:30"],
    [45, "0:45"],
    [120, "2:00"],
    [65, "1:05"],
    [0, "0:00"],
  ])("formats %i s of rest as %s", (rest, expected) => {
    expect(buildSetBlock({ repMode: "fixed", intensity: "none", rest, sets: [] }).restStr).toBe(
      expected,
    );
  });
});

describe("buildEditor", () => {
  it("returns null when the program has no days", () => {
    expect(buildEditor(EMPTY_PROGRAM, null, library)).toBeNull();
    expect(buildEditor(EMPTY_PROGRAM, "d-push", library)).toBeNull();
  });

  it("edits the first day when none, or an unknown one, is selected", () => {
    expect(buildEditor(fixedProgram(), null, library)?.dayId).toBe("d-push");
    expect(buildEditor(fixedProgram(), "deleted-day", library)?.dayId).toBe("d-push");
  });

  it("describes the selected day of a fixed weekday plan", () => {
    const editor = buildEditor(fixedProgram(), "d-pull", library);

    expect(editor).toMatchObject({
      dayId: "d-pull",
      name: "Pull",
      isFixed: true,
      isWeekday: true,
      weekday: 3,
      dayOrderLabel: "Day 2",
      summary: "3 exercises · 5 sets",
    });
  });

  it("describes an exercise by its library name, muscles and equipment", () => {
    const editor = buildEditor(fixedProgram(), "d-push", library)!;
    const first = editor.rows[0]!;

    expect(first.kind).toBe("ex");
    if (first.kind !== "ex") return;
    expect(first.ex).toMatchObject({
      id: "e-bench",
      name: "Barbell Bench Press",
      muscles: "Chest, Front Delts, Triceps",
      equip: "BARBELL",
      supersetTag: null,
    });
    expect(first.ex.block.rows).toHaveLength(4);
    expect(editor.rows.map(rowNames)).toEqual([
      "Barbell Bench Press",
      "Barbell Overhead Press",
      "Plank",
    ]);
  });

  it("gathers consecutive superset members into one group tagged A1, A2", () => {
    const editor = buildEditor(fixedProgram(), "d-pull", library)!;

    expect(editor.rows.map((r) => r.kind)).toEqual(["superset", "ex"]);
    expect(editor.rows.map(rowNames)).toEqual([
      ["A1 Pull-Up", "A2 Cable Lat Pulldown"],
      "Barbell Deadlift",
    ]);
  });

  it("keeps two back-to-back supersets apart", () => {
    const program = fixedProgram();
    const push = dayOf(program, "d-push");
    push.exercises[0]!.supersetId = "ss-a";
    push.exercises[1]!.supersetId = "ss-a";
    const pull = dayOf(program, "d-pull");
    push.exercises.push(...pull.exercises.slice(0, 2));

    const editor = buildEditor(program, "d-push", library)!;

    // bench+ohp (ss-a), plank, pull-up+pulldown (ss-1)
    expect(editor.rows.map((r) => r.kind)).toEqual(["superset", "ex", "superset"]);

    // …and with the plain exercise out of the way the two groups still do not merge.
    push.exercises.splice(2, 1);
    expect(buildEditor(program, "d-push", library)!.rows.map(rowNames)).toEqual([
      ["A1 Barbell Bench Press", "A2 Barbell Overhead Press"],
      ["A1 Pull-Up", "A2 Cable Lat Pulldown"],
    ]);
  });

  it("falls back to the exercise id when the library no longer has it", () => {
    const program = fixedProgram();
    dayOf(program, "d-push").exercises[0]!.exId = "retired_custom_lift";

    const row = buildEditor(program, "d-push", library)!.rows[0]!;

    expect(row.kind === "ex" && row.ex).toMatchObject({
      name: "retired_custom_lift",
      muscles: "",
      equip: "",
    });
  });

  it("lists each cycled slot with its target muscle and pool", () => {
    const editor = buildEditor(cycledProgram(), "d-upper", library)!;

    expect(editor.isFixed).toBe(false);
    expect(editor.summary).toBe("2 muscles · 5 sets");
    expect(editor.rows.map((r) => r.kind)).toEqual(["slot", "slot"]);

    const chest = editor.rows[0]!;
    if (chest.kind !== "slot") throw new Error("expected a slot row");
    expect(chest.slot).toMatchObject({
      id: "s-chest",
      muscle: "chest",
      muscleName: "Chest",
      poolStr: "3 exercises",
    });
    expect(chest.slot.poolNames).toEqual([
      { id: BENCH, name: "Barbell Bench Press" },
      { id: DB_BENCH, name: "Dumbbell Bench Press" },
      { id: PUSH_UP, name: "Push-Up" },
    ]);
    expect(chest.slot.block.rows.map((r) => r.repsStr)).toEqual(["8–12", "8–12", "8–12"]);
  });

  it("shows an unknown pool entry by its id", () => {
    const program = cycledProgram();
    dayOf(program, "d-core").slots[0]!.pool.push("mystery_hold");

    const row = buildEditor(program, "d-core", library)!.rows[0]!;

    expect(row.kind === "slot" && row.slot.poolNames).toEqual([
      { id: PLANK, name: "Plank" },
      { id: "mystery_hold", name: "mystery_hold" },
    ]);
  });

  it("labels a floating day by its position", () => {
    const editor = buildEditor(floating(fixedProgram()), "d-pull", library)!;

    expect(editor).toMatchObject({ isWeekday: false, weekday: null, dayOrderLabel: "Day 2" });
  });
});

describe("buildBoard", () => {
  it("lays a weekday plan out Monday to Sunday with rest days in the gaps", () => {
    const board = buildBoard(fixedProgram(), null, library);

    expect(board.map((c) => c.label)).toEqual(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
    expect(board.map((c) => c.kind)).toEqual([
      "day",
      "rest",
      "day",
      "rest",
      "rest",
      "rest",
      "rest",
    ]);
    expect(board.map((c) => c.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(board[0]).toMatchObject({ dayId: "d-push", name: "Push", more: 0 });
    expect(board[2]).toMatchObject({ dayId: "d-pull", name: "Pull" });
  });

  it("lists a fixed day's exercises as chips, marking superset members", () => {
    const board = buildBoard(fixedProgram(), null, library);

    expect(board[0]!.chips).toEqual([
      { name: "Barbell Bench Press", superset: false },
      { name: "Barbell Overhead Press", superset: false },
      { name: "Plank", superset: false },
    ]);
    expect(board[2]!.chips).toEqual([
      { name: "Pull-Up", superset: true },
      { name: "Cable Lat Pulldown", superset: true },
      { name: "Barbell Deadlift", superset: false },
    ]);
  });

  it("caps a card at four chips and counts the rest", () => {
    const program = fixedProgram();
    const push = dayOf(program, "d-push");
    push.exercises.push(...dayOf(program, "d-pull").exercises); // 6 exercises

    const monday = buildBoard(program, null, library)[0]!;

    expect(monday.chips?.map((c) => c.name)).toEqual([
      "Barbell Bench Press",
      "Barbell Overhead Press",
      "Plank",
      "Pull-Up",
    ]);
    expect(monday.more).toBe(2);
  });

  it("marks the day being edited — the first one by default", () => {
    const editing = (editDayId: string | null) =>
      buildBoard(fixedProgram(), editDayId, library)
        .filter((c) => c.editing)
        .map((c) => c.dayId);

    expect(editing(null)).toEqual(["d-push"]);
    expect(editing("d-pull")).toEqual(["d-pull"]);
    expect(editing("deleted-day")).toEqual(["d-push"]);
  });

  it("lays a floating plan out as DAY 1..N followed by an add column", () => {
    const board = buildBoard(floating(fixedProgram()), "d-pull", library);

    expect(board.map((c) => [c.kind, c.label])).toEqual([
      ["day", "DAY 1"],
      ["day", "DAY 2"],
      ["add", "ADD"],
    ]);
    expect(board.map((c) => c.name)).toEqual(["Push", "Pull", undefined]);
    expect(board[1]!.editing).toBe(true);
    expect(board[0]!.editing).toBe(false);
  });

  it("offers only the add column for an empty floating plan, and seven rest days for an empty weekday plan", () => {
    expect(buildBoard({ ...EMPTY_PROGRAM, schedule: "floating" }, null, library)).toEqual([
      { kind: "add", label: "ADD" },
    ]);
    expect(buildBoard(EMPTY_PROGRAM, null, library).map((c) => c.kind)).toEqual(
      Array(7).fill("rest"),
    );
  });

  it("shows a cycled day's target muscles as chips", () => {
    const board = buildBoard(cycledProgram(), null, library);

    expect(board[0]!.chips).toEqual([
      { name: "Chest", superset: false },
      { name: "Lats", superset: false },
    ]);
    expect(board[3]).toMatchObject({ label: "THU", name: "Core", chips: [{ name: "Abs" }] });
  });

  it("falls back to the exercise id on a chip when the library no longer has it", () => {
    const program = fixedProgram();
    dayOf(program, "d-pull").exercises[2]!.exId = "retired_custom_lift";

    const names = buildBoard(program, null, library)[2]!.chips!.map((c) => c.name);

    expect(names).toEqual(["Pull-Up", "Cable Lat Pulldown", "retired_custom_lift"]);
  });
});
