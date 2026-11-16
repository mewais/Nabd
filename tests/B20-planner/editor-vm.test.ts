import { EMPTY_PROGRAM } from "@nabd/domain";
import {
  BENCH,
  DB_BENCH,
  PLANK,
  PUSH_UP,
  cycledProgram,
  dayOf,
  editorOf,
  fixedProgram,
  floating,
  vmOf,
} from "./fixtures";

/** What each editor row shows, compactly. */
const rowNames = (rows: ReturnType<typeof editorOf>["rows"]): (string | string[])[] =>
  rows.map((row) =>
    row.kind === "exercise"
      ? row.exercise.name
      : row.kind === "superset"
        ? row.members.map((m) => `${m.supersetTag} ${m.name}`)
        : row.slot.muscleName,
  );

describe("editor view-model", () => {
  it("is absent when the program has no days", () => {
    expect(vmOf(EMPTY_PROGRAM).editor).toBeNull();
    expect(vmOf(EMPTY_PROGRAM, "d-push").editor).toBeNull();
  });

  it("edits the first day when none, or an unknown one, is selected", () => {
    expect(editorOf(fixedProgram()).dayId).toBe("d-push");
    expect(editorOf(fixedProgram(), "deleted-day").dayId).toBe("d-push");
  });

  it("describes the selected day of a fixed weekday plan", () => {
    expect(editorOf(fixedProgram(), "d-pull")).toMatchObject({
      dayId: "d-pull",
      name: "Pull",
      type: "fixed",
      placement: { kind: "weekday", weekday: 3 },
      summary: "3 exercises · 5 sets",
    });
  });

  it("places a floating day by its position in the plan", () => {
    expect(editorOf(floating(fixedProgram()), "d-pull").placement).toEqual({
      kind: "floating",
      label: "Day 2 · floating",
    });
  });

  it("describes an exercise by its library name, muscles and equipment", () => {
    const editor = editorOf(fixedProgram(), "d-push");
    const first = editor.rows[0]!;

    expect(first.kind === "exercise" && first.exercise).toMatchObject({
      id: "e-bench",
      name: "Barbell Bench Press",
      muscles: "Chest, Front Delts, Triceps",
      equipment: "BARBELL",
      supersetTag: null,
    });
    expect(rowNames(editor.rows)).toEqual([
      "Barbell Bench Press",
      "Barbell Overhead Press",
      "Plank",
    ]);
  });

  it("gathers consecutive superset members into one group tagged A1, A2", () => {
    expect(rowNames(editorOf(fixedProgram(), "d-pull").rows)).toEqual([
      ["A1 Pull-Up", "A2 Cable Lat Pulldown"],
      "Barbell Deadlift",
    ]);
  });

  it("keeps two back-to-back supersets apart", () => {
    const program = fixedProgram();
    const push = dayOf(program, "d-push");
    push.exercises[0]!.supersetId = "ss-a";
    push.exercises[1]!.supersetId = "ss-a";
    push.exercises.splice(2, 1, ...dayOf(program, "d-pull").exercises.slice(0, 2));

    expect(rowNames(editorOf(program, "d-push").rows)).toEqual([
      ["A1 Barbell Bench Press", "A2 Barbell Overhead Press"],
      ["A1 Pull-Up", "A2 Cable Lat Pulldown"],
    ]);
  });

  it("falls back to the exercise id when the library no longer has it", () => {
    const program = fixedProgram();
    dayOf(program, "d-push").exercises[0]!.exId = "retired_custom_lift";

    const row = editorOf(program, "d-push").rows[0]!;

    expect(row.kind === "exercise" && row.exercise).toMatchObject({
      name: "retired_custom_lift",
      muscles: "",
      equipment: "",
    });
  });

  it("lists each cycled slot with its target muscle and pool", () => {
    const editor = editorOf(cycledProgram(), "d-upper");

    expect(editor.type).toBe("cycled");
    expect(editor.summary).toBe("2 muscles · 5 sets");
    expect(rowNames(editor.rows)).toEqual(["Chest", "Lats"]);

    const chest = editor.rows[0]!;
    expect(chest.kind === "slot" && chest.slot).toMatchObject({
      id: "s-chest",
      muscle: "chest",
      hint: "Targets Chest · cycles its pool",
      poolLabel: "Exercise pool · 3 exercises",
      pool: [
        { id: BENCH, name: "Barbell Bench Press" },
        { id: DB_BENCH, name: "Dumbbell Bench Press" },
        { id: PUSH_UP, name: "Push-Up" },
      ],
    });
  });

  it("shows an unknown pool entry by its id", () => {
    const program = cycledProgram();
    dayOf(program, "d-core").slots[0]!.pool.push("mystery_hold");

    const row = editorOf(program, "d-core").rows[0]!;

    expect(row.kind === "slot" && row.slot.pool).toEqual([
      { id: PLANK, name: "Plank" },
      { id: "mystery_hold", name: "mystery_hold" },
    ]);
  });
});
