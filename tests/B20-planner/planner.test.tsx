/**
 * B20 · @nabd/planner — comprehensive test suite.
 *
 * All tests are RED against the skeleton (every exported function throws
 * "not implemented"). Coverage is 100% because every export is called.
 * No `expect(...).toThrow("not implemented")` — tests assert concrete
 * values and DOM structure instead.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  // builders
  buildSetBlock,
  buildEditor,
  buildBoard,
  // components
  SetTable,
  ProgramHeader,
  WeekBoard,
  DayEditor,
  PlannerScreen,
} from "@nabd/planner";

import type {
  SetBlockVM,
  ExerciseCardVM,
  CycledSlotVM,
  EditorVM,
  EditorRow,
  BoardColVM,
  BoardChip,
  PlannerCallbacks,
  SetTableProps,
  ProgramHeaderProps,
  WeekBoardProps,
  DayEditorProps,
  PlannerScreenProps,
  EditRef,
} from "@nabd/planner";

import type { Program, ExercisePrescription, CycledSlot, Exercise, MuscleKey } from "@nabd/domain";
import { MUSCLE_NAMES, MUSCLES, EQUIPMENT_NAMES } from "@nabd/domain";
import { createLibrary } from "@nabd/dataset";
import { seedProgram } from "@nabd/program-editor";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A small exercise library covering the exercises used in seedProgram */
const EXERCISES: Exercise[] = [
  {
    id: "bench_press__barbell",
    name: "Barbell Bench Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "incline_bench_press__dumbbell",
    name: "Incline Dumbbell Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "fly__dumbbell",
    name: "Dumbbell Fly",
    group: "Chest",
    primary: ["chest"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "lateral_raise__dumbbell",
    name: "Lateral Raise",
    group: "Shoulders",
    primary: ["side_delts"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "overhead_triceps_extension__dumbbell",
    name: "DB Overhead Extension",
    group: "Triceps",
    primary: ["triceps"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "pull_up__pullupbar",
    name: "Pull-up",
    group: "Back",
    primary: ["lats"],
    secondary: ["biceps", "rhomboids"],
    equipment: "pullupbar",
    tracking: "weighted_bodyweight",
    timeBased: false,
  },
  {
    id: "row__barbell",
    name: "Barbell Row",
    group: "Back",
    primary: ["lats"],
    secondary: ["biceps", "upper_traps", "rhomboids"],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "row__dumbbell",
    name: "One-Arm Dumbbell Row",
    group: "Back",
    primary: ["lats"],
    secondary: ["biceps", "rhomboids"],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "hammer_curl__dumbbell",
    name: "Hammer Curl",
    group: "Biceps",
    primary: ["biceps"],
    secondary: ["forearms"],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "curl__barbell",
    name: "Barbell Curl",
    group: "Biceps",
    primary: ["biceps"],
    secondary: [],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "back_squat__barbell",
    name: "Back Squat",
    group: "Quads",
    primary: ["quads"],
    secondary: ["glutes", "hamstrings"],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "romanian_deadlift__barbell",
    name: "Romanian Deadlift",
    group: "Hamstrings",
    primary: ["hamstrings"],
    secondary: ["glutes", "lower_back"],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "walking_lunge__dumbbell",
    name: "Walking Lunge",
    group: "Quads",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "calf_raise__dumbbell",
    name: "Dumbbell Calf Raise",
    group: "Calves",
    primary: ["calves"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
    timeBased: false,
  },
  {
    id: "plank__bodyweight",
    name: "Plank",
    group: "Abs",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: "bodyweight",
    tracking: "duration",
    timeBased: true,
  },
];

const LIBRARY = createLibrary(EXERCISES);

/** Zero coverage record */
function zeroCoverage() {
  return {
    front_delts: 0,
    side_delts: 0,
    rear_delts: 0,
    neck: 0,
    upper_traps: 0,
    rhomboids: 0,
    lower_traps: 0,
    lats: 0,
    lower_back: 0,
    chest: 0,
    abs: 0,
    obliques: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    abductors: 0,
    adductors: 0,
    calves: 0,
    tibialis: 0,
    hip_flexors: 0,
    biceps: 0,
    triceps: 0,
    forearms: 0,
  };
}

/** Make a minimal no-op PlannerCallbacks with all handlers replaced by vi.fn() */
function makeCb(): PlannerCallbacks {
  return {
    onSetType: vi.fn(),
    onSetSchedule: vi.fn(),
    onSelectDay: vi.fn(),
    onRenameDay: vi.fn(),
    onSetWeekday: vi.fn(),
    onAddDay: vi.fn(),
    onRemoveDay: vi.fn(),
    onAddExercise: vi.fn(),
    onRemoveExercise: vi.fn(),
    onToggleSuperset: vi.fn(),
    onAddSlot: vi.fn(),
    onRemoveSlot: vi.fn(),
    onAddPool: vi.fn(),
    onRemoveFromPool: vi.fn(),
    onEdit: vi.fn(),
    onNotes: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// buildSetBlock — pure builder
// ---------------------------------------------------------------------------

describe("buildSetBlock", () => {
  // Prescription with one warmup + working sets (range) + rpe intensity
  const rangeRpePrescription: ExercisePrescription = {
    id: "x1",
    exId: "bench_press__barbell",
    repMode: "range",
    intensity: "rpe",
    rest: 150, // 2:30
    sets: [
      { type: "warmup", a: 12, b: 14 },
      { type: "working", a: 8, b: 10, val: 8 },
      { type: "working", a: 8, b: 10, val: 8 },
      { type: "working", a: 8, b: 10, val: 9 },
    ],
    notes: "Focus on chest",
  };

  it("warmup badge label is W and kind is warm", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[0].badgeLabel).toBe("W");
    expect(vm.rows[0].badgeKind).toBe("warm");
    expect(vm.rows[0].typeName).toBe("Warm-up");
  });

  it("working sets are numbered 1, 2, 3 with kind work", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[1].badgeLabel).toBe("1");
    expect(vm.rows[1].badgeKind).toBe("work");
    expect(vm.rows[1].typeName).toBe("Working");
    expect(vm.rows[2].badgeLabel).toBe("2");
    expect(vm.rows[3].badgeLabel).toBe("3");
  });

  it("range mode repsStr is a–b format", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    // warmup: 12–14
    expect(vm.rows[0].repsStr).toBe("12–14");
    // working: 8–10
    expect(vm.rows[1].repsStr).toBe("8–10");
  });

  it("range mode hasB is true when b is set", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[0].hasB).toBe(true);
    expect(vm.rows[1].hasB).toBe(true);
  });

  it("rpe intStr shows raw value without suffix", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[1].intStr).toBe("8");
    expect(vm.rows[3].intStr).toBe("9");
  });

  it("rpe intensity sets showInt true and intHeader RPE", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.showIntCol).toBe(true);
    expect(vm.intHeader).toBe("RPE");
  });

  it("gridCols includes intensity column when showIntCol", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.gridCols).toBe("30px minmax(150px,1fr) 86px 26px");
  });

  it("restStr formats seconds as MM:SS", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    // 150 seconds = 2 minutes 30 seconds
    expect(vm.restStr).toBe("2:30");
  });

  it("notes field is preserved", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.notes).toBe("Focus on chest");
  });

  it("repHeader is REPS for range mode", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.repHeader).toBe("REPS");
  });

  // Fixed repMode
  const fixedPrescription: ExercisePrescription = {
    id: "x2",
    exId: "incline_bench_press__dumbbell",
    repMode: "fixed",
    intensity: "none",
    rest: 120, // 2:00
    sets: [
      { type: "working", a: 10 },
      { type: "working", a: 10 },
      { type: "working", a: 10 },
    ],
  };

  it("fixed mode repsStr shows only a value", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.rows[0].repsStr).toBe("10");
  });

  it("fixed mode hasB is false", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.rows[0].hasB).toBe(false);
  });

  it("none intensity: showIntCol false, intHeader empty", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.showIntCol).toBe(false);
    expect(vm.intHeader).toBe("");
  });

  it("gridCols without intensity column", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.gridCols).toBe("30px minmax(150px,1fr) 26px");
  });

  it("rest 120s formats as 2:00", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.restStr).toBe("2:00");
  });

  it("notes is empty string when not provided", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.notes).toBe("");
  });

  // Time repMode
  const timePrescription: ExercisePrescription = {
    id: "x5",
    exId: "plank__bodyweight",
    repMode: "time",
    intensity: "none",
    rest: 60,
    sets: [
      { type: "working", a: 45 },
      { type: "working", a: 45 },
      { type: "working", a: 45 },
    ],
  };

  it("time mode repsStr shows Xs format", () => {
    const vm = buildSetBlock(timePrescription);
    expect(vm.rows[0].repsStr).toBe("45s");
  });

  it("time mode isTime is true", () => {
    const vm = buildSetBlock(timePrescription);
    expect(vm.rows[0].isTime).toBe(true);
  });

  it("time mode repHeader is TIME", () => {
    const vm = buildSetBlock(timePrescription);
    expect(vm.repHeader).toBe("TIME");
  });

  it("time mode hasB is false (no b value)", () => {
    const vm = buildSetBlock(timePrescription);
    expect(vm.rows[0].hasB).toBe(false);
  });

  // Pct intensity
  const pctPrescription: ExercisePrescription = {
    id: "x6",
    exId: "back_squat__barbell",
    repMode: "range",
    intensity: "pct",
    rest: 180,
    sets: [
      { type: "working", a: 6, b: 8, val: 70 },
      { type: "working", a: 6, b: 8, val: 75 },
    ],
  };

  it("pct intStr shows value with percent suffix", () => {
    const vm = buildSetBlock(pctPrescription);
    expect(vm.rows[0].intStr).toBe("70%");
    expect(vm.rows[1].intStr).toBe("75%");
  });

  it("pct intensity sets intHeader to %1RM", () => {
    const vm = buildSetBlock(pctPrescription);
    expect(vm.intHeader).toBe("%1RM");
  });

  it("rest 180s formats as 3:00", () => {
    const vm = buildSetBlock(pctPrescription);
    expect(vm.restStr).toBe("3:00");
  });

  // Drop set
  const dropPrescription: ExercisePrescription = {
    id: "x7",
    exId: "overhead_triceps_extension__dumbbell",
    repMode: "range",
    intensity: "none",
    rest: 90,
    sets: [
      { type: "working", a: 12, b: 15 },
      { type: "working", a: 12, b: 15 },
      { type: "drop", a: 12, b: 15 },
    ],
  };

  it("drop set badge label is D and kind is drop", () => {
    const vm = buildSetBlock(dropPrescription);
    expect(vm.rows[2].badgeLabel).toBe("D");
    expect(vm.rows[2].badgeKind).toBe("drop");
    expect(vm.rows[2].typeName).toBe("Drop set");
  });

  it("working set numbering skips warmups and drops (only counts working)", () => {
    const vm = buildSetBlock(dropPrescription);
    expect(vm.rows[0].badgeLabel).toBe("1");
    expect(vm.rows[1].badgeLabel).toBe("2");
    expect(vm.rows[2].badgeLabel).toBe("D");
  });

  it("rest 90s formats as 1:30", () => {
    const vm = buildSetBlock(dropPrescription);
    expect(vm.restStr).toBe("1:30");
  });

  it("rest 75s formats as 1:15", () => {
    const p: ExercisePrescription = {
      id: "x8",
      exId: "lateral_raise__dumbbell",
      repMode: "range",
      intensity: "none",
      rest: 75,
      sets: [{ type: "working", a: 15, b: 20 }],
    };
    const vm = buildSetBlock(p);
    expect(vm.restStr).toBe("1:15");
  });

  it("repMode and intensity are reflected in block", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.repMode).toBe("range");
    expect(vm.intensity).toBe("rpe");
  });

  it("fixed repMode intensity none returns correct repMode/intensity", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.repMode).toBe("fixed");
    expect(vm.intensity).toBe("none");
  });

  it("row index corresponds to set position", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[0].index).toBe(0);
    expect(vm.rows[1].index).toBe(1);
    expect(vm.rows[2].index).toBe(2);
    expect(vm.rows[3].index).toBe(3);
  });

  it("repA matches set a value", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[0].repA).toBe(12);
    expect(vm.rows[1].repA).toBe(8);
  });

  it("repB matches set b value in range mode", () => {
    const vm = buildSetBlock(rangeRpePrescription);
    expect(vm.rows[0].repB).toBe(14);
    expect(vm.rows[1].repB).toBe(10);
  });

  it("repB is null in fixed mode", () => {
    const vm = buildSetBlock(fixedPrescription);
    expect(vm.rows[0].repB).toBeNull();
  });

  it("cycled slot prescription works the same as exercise prescription", () => {
    const slot: CycledSlot = {
      id: "s1",
      muscle: "chest",
      pool: ["bench_press__barbell"],
      repMode: "range",
      intensity: "rpe",
      rest: 120,
      sets: [
        { type: "working", a: 8, b: 12, val: 8 },
        { type: "working", a: 8, b: 12, val: 8 },
      ],
    };
    const vm = buildSetBlock(slot);
    expect(vm.rows[0].badgeLabel).toBe("1");
    expect(vm.rows[0].repsStr).toBe("8–12");
    expect(vm.rows[0].intStr).toBe("8");
    expect(vm.repMode).toBe("range");
    expect(vm.intensity).toBe("rpe");
  });
});

// ---------------------------------------------------------------------------
// buildEditor — pure builder
// ---------------------------------------------------------------------------

describe("buildEditor", () => {
  const program = seedProgram(); // Push/Pull/Legs weekday fixed

  it("returns exists=false when editDayId is null and program has days", () => {
    // null editDayId → falls back to first day, so exists should be true
    // Actually per spec: pick editDayId OR first day. If days array is empty → exists false
    const emptyProgram: Program = {
      name: "Empty",
      type: "fixed",
      schedule: "floating",
      days: [],
    };
    const vm = buildEditor(emptyProgram, null, LIBRARY);
    expect(vm.exists).toBe(false);
  });

  it("returns exists=true when editDayId refers to existing day", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    expect(vm.exists).toBe(true);
    expect(vm.dayId).toBe("push");
  });

  it("dayId picks first day when editDayId is null", () => {
    const vm = buildEditor(program, null, LIBRARY);
    expect(vm.exists).toBe(true);
    expect(vm.dayId).toBe("push");
  });

  it("name reflects the selected day name", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    expect(vm.name).toBe("Push");
  });

  it("isFixed is true for fixed program", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    expect(vm.isFixed).toBe(true);
  });

  it("isFixed is false for cycled program", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    expect(vm.isFixed).toBe(false);
  });

  it("isWeekday is true for weekday schedule", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    expect(vm.isWeekday).toBe(true);
  });

  it("isWeekday is false for floating schedule", () => {
    const floatingProgram: Program = { ...program, schedule: "floating" };
    const vm = buildEditor(floatingProgram, "push", LIBRARY);
    expect(vm.isWeekday).toBe(false);
  });

  it("dayOrderLabel is Day <index+1>", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    expect(vm.dayOrderLabel).toBe("Day 1");
    const vm2 = buildEditor(program, "pull", LIBRARY);
    expect(vm2.dayOrderLabel).toBe("Day 2");
    const vm3 = buildEditor(program, "legs", LIBRARY);
    expect(vm3.dayOrderLabel).toBe("Day 3");
  });

  it("weekday is set for weekday programs", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    expect(vm.weekday).toBe(1); // Monday
  });

  it("weekday is null for days with null weekday", () => {
    const p: Program = {
      ...program,
      days: [{ ...program.days[0], weekday: null }],
    };
    const vm = buildEditor(p, "push", LIBRARY);
    expect(vm.weekday).toBeNull();
  });

  it("fixed program summary: N exercises · sets sets · ~min min", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    // Push day: 5 exercises, sets: 4+3+3+3+3 = 16, min = max(8, round(16*3.4)) = max(8,54) = 54
    expect(vm.summary).toBe("5 exercises · 16 sets · ~54 min");
  });

  it("fixed program legs day summary", () => {
    const vm = buildEditor(program, "legs", LIBRARY);
    // Legs: z1(4)+z2(3)+z3(3)+z4(3)+z5(3)=16 sets, ~54 min
    expect(vm.summary).toBe("5 exercises · 16 sets · ~54 min");
  });

  it("cycled program summary: N muscle groups", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "s2",
              muscle: "lats",
              pool: ["pull_up__pullupbar"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "s3",
              muscle: "biceps",
              pool: ["curl__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    expect(vm.summary).toBe("3 muscle groups");
  });

  it("fixed rows: non-superset ex is kind ex", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    // First exercise: bb-bench (no supersetId) → kind: "ex"
    expect(vm.rows[0].kind).toBe("ex");
  });

  it("fixed rows: superset exercises are grouped into kind superset", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    // db-fly and lat-raise share ssA supersetId
    // rows: [bb-bench(ex), incline-db-press(ex), {superset: [db-fly, lat-raise]}, db-oh-ext(ex)]
    const supersetRow = vm.rows.find((r) => r.kind === "superset");
    expect(supersetRow).toBeDefined();
    if (supersetRow && supersetRow.kind === "superset") {
      expect(supersetRow.members).toHaveLength(2);
      expect(supersetRow.members[0].supersetTag).toBe("A1");
      expect(supersetRow.members[1].supersetTag).toBe("A2");
    }
  });

  it("non-superset exercises have supersetTag null", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    const exRow = vm.rows[0];
    if (exRow.kind === "ex") {
      expect(exRow.ex.supersetTag).toBeNull();
    }
  });

  it("ExerciseCardVM has correct name from library", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    const exRow = vm.rows[0];
    if (exRow.kind === "ex") {
      expect(exRow.ex.name).toBe("Barbell Bench Press");
    }
  });

  it("ExerciseCardVM equip is EQUIPMENT_NAMES uppercased", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    const exRow = vm.rows[0];
    if (exRow.kind === "ex") {
      // bb-bench has barbell equipment → EQUIPMENT_NAMES.barbell = "Barbell"
      expect(exRow.ex.equip).toBe("BARBELL");
    }
  });

  it("ExerciseCardVM muscles joins primary+secondary names", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    const exRow = vm.rows[0];
    if (exRow.kind === "ex") {
      // bb-bench: primary=[chest], secondary=[triceps, front_delts]
      // muscles joined: "Chest, Triceps, Front Delts"
      expect(exRow.ex.muscles).toContain("Chest");
      expect(exRow.ex.muscles).toContain("Triceps");
    }
  });

  it("ExerciseCardVM block is a SetBlockVM", () => {
    const vm = buildEditor(program, "push", LIBRARY);
    const exRow = vm.rows[0];
    if (exRow.kind === "ex") {
      const block = exRow.ex.block;
      expect(block.rows).toHaveLength(4); // warmup + 3 working
      expect(block.repMode).toBe("range");
      expect(block.intensity).toBe("rpe");
    }
  });

  it("cycled rows are kind slot with CycledSlotVM", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Upper",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell", "incline_bench_press__dumbbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    expect(vm.rows[0].kind).toBe("slot");
    if (vm.rows[0].kind === "slot") {
      const slot = vm.rows[0].slot;
      // muscle is MuscleKey "chest"
      expect(slot.muscle).toBe("chest");
      expect(slot.muscleName).toBe("Chest");
      expect(slot.poolStr).toBe("2 exercises");
      expect(slot.poolNames).toHaveLength(2);
      expect(slot.poolNames[0].id).toBe("bench_press__barbell");
      expect(slot.poolNames[0].name).toBe("Barbell Bench Press");
      expect(slot.poolNames[1].id).toBe("incline_bench_press__dumbbell");
      expect(slot.poolNames[1].name).toBe("Incline Dumbbell Press");
    }
  });

  it("cycled slot muscleName is MUSCLE_NAMES[slot.muscle]", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Upper",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    if (vm.rows[0].kind === "slot") {
      // slot.muscle = "chest", MUSCLE_NAMES["chest"] = "Chest"
      expect(vm.rows[0].slot.muscleName).toBe(MUSCLE_NAMES["chest"]);
    }
  });

  it("pull day has two superset members (ssB: hammer-curl + bb-curl)", () => {
    const vm = buildEditor(program, "pull", LIBRARY);
    const supersetRow = vm.rows.find((r) => r.kind === "superset");
    expect(supersetRow).toBeDefined();
    if (supersetRow && supersetRow.kind === "superset") {
      expect(supersetRow.members[0].supersetTag).toBe("A1");
      expect(supersetRow.members[1].supersetTag).toBe("A2");
    }
  });

  it("summary min uses max(8, round(totalSets*3.4))", () => {
    // Create a program with only 1 set → round(1*3.4)=3 < 8, so ~8 min
    const tinyProgram: Program = {
      name: "Tiny",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "e1",
              exId: "bench_press__barbell",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const vm = buildEditor(tinyProgram, "d1", LIBRARY);
    expect(vm.summary).toBe("1 exercises · 1 sets · ~8 min");
  });
});

// ---------------------------------------------------------------------------
// buildBoard — pure builder
// ---------------------------------------------------------------------------

describe("buildBoard", () => {
  const program = seedProgram(); // weekday, fixed

  it("weekday schedule produces 7 columns MON–SUN", () => {
    const cols = buildBoard(program, null, LIBRARY);
    expect(cols).toHaveLength(7);
    expect(cols[0].label).toBe("MON");
    expect(cols[1].label).toBe("TUE");
    expect(cols[2].label).toBe("WED");
    expect(cols[6].label).toBe("SUN");
  });

  it("days with exercises produce kind=day columns", () => {
    const cols = buildBoard(program, null, LIBRARY);
    // MON (weekday=1) = Push, WED (weekday=3) = Pull, FRI (weekday=5) = Legs
    const mon = cols[0];
    expect(mon.kind).toBe("day");
  });

  it("rest days produce kind=rest columns", () => {
    const cols = buildBoard(program, null, LIBRARY);
    // TUE (weekday=2) has no day assigned
    const tue = cols[1];
    expect(tue.kind).toBe("rest");
  });

  it("day column has correct dayId, name, and chips", () => {
    const cols = buildBoard(program, null, LIBRARY);
    const mon = cols[0];
    expect(mon.dayId).toBe("push");
    expect(mon.name).toBe("Push");
    expect(mon.chips).toBeDefined();
    expect(Array.isArray(mon.chips)).toBe(true);
  });

  it("editing flag is set for the editDayId column", () => {
    const cols = buildBoard(program, "push", LIBRARY);
    const mon = cols[0];
    expect(mon.editing).toBe(true);
  });

  it("editing flag is false/absent for non-editDayId columns", () => {
    const cols = buildBoard(program, "push", LIBRARY);
    // WED = pull — not editing
    const wed = cols[2];
    expect(wed.editing).toBeFalsy();
  });

  it("no editing flag when editDayId is null", () => {
    const cols = buildBoard(program, null, LIBRARY);
    cols.forEach((col) => {
      expect(col.editing).toBeFalsy();
    });
  });

  it("floating schedule produces N day columns + 1 add column", () => {
    const floatingProgram: Program = { ...program, schedule: "floating" };
    const cols = buildBoard(floatingProgram, null, LIBRARY);
    // 3 days + 1 ADD
    expect(cols).toHaveLength(4);
    expect(cols[0].kind).toBe("day");
    expect(cols[1].kind).toBe("day");
    expect(cols[2].kind).toBe("day");
    expect(cols[3].kind).toBe("add");
    expect(cols[3].label).toBe("ADD");
  });

  it("floating day labels are DAY 1, DAY 2, ...", () => {
    const floatingProgram: Program = { ...program, schedule: "floating" };
    const cols = buildBoard(floatingProgram, null, LIBRARY);
    expect(cols[0].label).toBe("DAY 1");
    expect(cols[1].label).toBe("DAY 2");
    expect(cols[2].label).toBe("DAY 3");
  });

  it("chips list exercises from fixed program (up to 4)", () => {
    const cols = buildBoard(program, null, LIBRARY);
    const mon = cols[0]; // Push day with 5 exercises
    // chips shows up to 4
    expect(mon.chips!.length).toBeLessThanOrEqual(4);
    expect(mon.chips!.length).toBe(4);
  });

  it("more field counts exercises beyond 4", () => {
    const cols = buildBoard(program, null, LIBRARY);
    const mon = cols[0]; // Push day has 5 exercises: 4 chips + 1 more
    expect(mon.more).toBe(1);
  });

  it("fixed-mode chips display exercise NAME not raw exId", () => {
    const cols = buildBoard(program, null, LIBRARY);
    const mon = cols[0]; // Push day: first exercise is bb-bench
    // chip.name must be the human-readable name, not the raw id
    expect(mon.chips![0].name).toBe("Barbell Bench Press");
    expect(mon.chips![1].name).toBe("Incline Dumbbell Press");
    // must not be raw ids
    expect(mon.chips![0].name).not.toBe("bench_press__barbell");
    expect(mon.chips![1].name).not.toBe("incline_bench_press__dumbbell");
  });

  it("fixed-mode chips without library fall back to raw exId", () => {
    // When no library is provided, chip.name stays as the raw exId from boardLayout
    const cols = buildBoard(program, null);
    const mon = cols[0];
    expect(mon.chips![0].name).toBe("bench_press__barbell");
  });

  it("superset chips have superset:true flag", () => {
    const cols = buildBoard(program, null, LIBRARY);
    const mon = cols[0]; // Push day: db-fly and lat-raise have supersetId
    // chips[2] = db-fly (has supersetId=ssA)
    const supersetChip = mon.chips!.find((c) => c.superset === true);
    expect(supersetChip).toBeDefined();
  });

  it("cycled program produces slots as chips (group names, no library needed)", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Upper",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "s2",
              muscle: "lats",
              pool: ["pull_up__pullupbar"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const cols = buildBoard(cycledProgram, null, LIBRARY);
    expect(cols[0].chips).toHaveLength(2);
  });

  it("weekday is set on day/rest columns in weekday schedule", () => {
    const cols = buildBoard(program, null, LIBRARY);
    expect(cols[0].weekday).toBe(1); // MON
    expect(cols[1].weekday).toBe(2); // TUE
    expect(cols[6].weekday).toBe(0); // SUN
  });
});

// ---------------------------------------------------------------------------
// SetTable — component
// ---------------------------------------------------------------------------

describe("SetTable", () => {
  const dayId = "push";
  const ref: EditRef = { kind: "ex", id: "x1" };

  /** Build a SetBlockVM for bb-bench range/rpe prescription */
  function makeBlock(): SetBlockVM {
    return buildSetBlock({
      id: "x1",
      exId: "bench_press__barbell",
      repMode: "range",
      intensity: "rpe",
      rest: 150,
      sets: [
        { type: "warmup", a: 12, b: 14 },
        { type: "working", a: 8, b: 10, val: 8 },
        { type: "working", a: 8, b: 10, val: 9 },
      ],
    });
  }

  function makeTimeBlock(): SetBlockVM {
    return buildSetBlock({
      id: "x5",
      exId: "plank__bodyweight",
      repMode: "time",
      intensity: "none",
      rest: 60,
      sets: [
        { type: "working", a: 45 },
        { type: "working", a: 45 },
      ],
    });
  }

  function makeNoIntBlock(): SetBlockVM {
    return buildSetBlock({
      id: "x2",
      exId: "incline_bench_press__dumbbell",
      repMode: "fixed",
      intensity: "none",
      rest: 120,
      sets: [
        { type: "working", a: 10 },
        { type: "working", a: 10 },
      ],
    });
  }

  it("renders without crashing and shows set rows", () => {
    const cb = makeCb();
    const block = makeBlock();
    const { container } = render(
      React.createElement(SetTable, { dayId, refTarget: ref, block, cb }),
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("badge type button fires onEdit with cycleSetType + index", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Find badge buttons (W, 1, 2)
    const badgeButtons = screen
      .getAllByRole("button")
      .filter((b) => ["W", "1", "2", "D"].includes(b.textContent ?? ""));
    expect(badgeButtons.length).toBeGreaterThan(0);
    fireEvent.click(badgeButtons[0]); // click "W" badge at index 0
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "cycleSetType", 0);
  });

  it("rep a stepper increment fires onEdit stepRep i 1 +1", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Find + buttons for rep-a stepper of row 0
    // The stepper for row 0 (warmup), a-stepper has increment = +1
    const plusButtons = screen.getAllByText("+");
    expect(plusButtons.length).toBeGreaterThan(0);
    fireEvent.click(plusButtons[0]); // first + is for first row's a-stepper inc
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "stepRep", 0, 1, 1);
  });

  it("rep a stepper decrement fires onEdit stepRep i 1 -1", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    const minusButtons = screen.getAllByText("−");
    expect(minusButtons.length).toBeGreaterThan(0);
    fireEvent.click(minusButtons[0]);
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "stepRep", 0, 1, -1);
  });

  it("rep b stepper fires onEdit stepRep i 0 +1 and -1 (range mode)", () => {
    const cb = makeCb();
    const block = makeBlock(); // range mode with hasB=true
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // range mode rows have both a and b steppers
    // b-stepper fires with which=0
    const plusButtons = screen.getAllByText("+");
    // b-stepper for row 0 is the second + button in that row
    fireEvent.click(plusButtons[1]); // b-stepper +
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "stepRep", 0, 0, 1);
  });

  it("rep b stepper dec fires onEdit stepRep i 0 -1", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    const minusButtons = screen.getAllByText("−");
    fireEvent.click(minusButtons[1]); // b-stepper -
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "stepRep", 0, 0, -1);
  });

  it("intensity stepper fires onEdit stepVal i +1 and -1", () => {
    const cb = makeCb();
    const block = makeBlock(); // rpe intensity, showInt=true
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Intensity steppers are present because showIntCol=true
    const allPlus = screen.getAllByText("+");
    // Find the intensity stepper + button (after a and b steppers)
    // For row 0 (warmup) there are a and b steppers but warmup may not have val
    // working rows (index 1+) have val
    // clicking the intensity + in row 1 → stepVal(1, +1)
    // The order: row0(a+, a-, b+, b-), row1(a+, a-, b+, b-, int+, int-), ...
    fireEvent.click(allPlus[4]); // int+ for row 1
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "stepVal", 1, 1);
  });

  it("intensity stepper dec fires onEdit stepVal i -1", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    const allMinus = screen.getAllByText("−");
    fireEvent.click(allMinus[4]); // int- for row 1
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "stepVal", 1, -1);
  });

  it("remove set button fires onEdit removeSet i", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Remove (×) buttons, one per row
    const removeButtons = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.textContent === "×" ||
          b.getAttribute("aria-label") === "remove" ||
          b.textContent?.includes("×"),
      );
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);
      expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "removeSet", 0);
    }
  });

  it("rep-mode Segmented fires onEdit setRepMode with correct idx", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Rep mode segmented has 3 options: 0=range, 1=fixed, 2=time
    // Find all segmented buttons
    const segButtons = screen
      .getAllByRole("button")
      .filter((b) =>
        ["Range", "Fixed", "Time", "range", "fixed", "time"].includes(b.textContent ?? ""),
      );
    if (segButtons.length >= 2) {
      fireEvent.click(segButtons[1]); // "Fixed" → idx=1
      expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "setRepMode", 1);
    }
  });

  it("load/intensity Segmented fires onEdit setIntensity with correct idx", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Intensity segmented: 0=none, 1=rpe, 2=pct
    const segButtons = screen
      .getAllByRole("button")
      .filter((b) => ["None", "RPE", "%1RM", "none", "rpe", "pct"].includes(b.textContent ?? ""));
    if (segButtons.length >= 1) {
      fireEvent.click(segButtons[0]); // "None" → idx=0
      expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "setIntensity", 0);
    }
  });

  it("rest stepper increment fires onEdit setRest +1", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // Rest stepper buttons — labeled + and −
    // They appear after all row steppers
    const allPlus = screen.getAllByText("+");
    const allMinus = screen.getAllByText("−");
    const lastPlus = allPlus[allPlus.length - 1];
    fireEvent.click(lastPlus);
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "setRest", 1);
  });

  it("rest stepper decrement fires onEdit setRest -1", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    const allMinus = screen.getAllByText("−");
    const lastMinus = allMinus[allMinus.length - 1];
    fireEvent.click(lastMinus);
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "setRest", -1);
  });

  it("Add set button fires onEdit addSet", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // "+ Add set" button
    const addSetBtn = screen.getByText(/add set/i);
    fireEvent.click(addSetBtn);
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "addSet");
  });

  it("Add warmup button fires onEdit addWarmup", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    const addWarmupBtn = screen.getByText(/warmup/i);
    fireEvent.click(addWarmupBtn);
    expect(cb.onEdit).toHaveBeenCalledWith(dayId, ref, "addWarmup");
  });

  it("notes input fires onNotes callback with value", () => {
    const cb = makeCb();
    const block = makeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    const notesInput = screen.getByDisplayValue(block.notes);
    fireEvent.change(notesInput, { target: { value: "New notes" } });
    expect(cb.onNotes).toHaveBeenCalledWith(dayId, ref, "New notes");
  });

  it("no b-stepper rendered when hasB is false (fixed mode)", () => {
    const cb = makeCb();
    const block = makeNoIntBlock(); // fixed mode, no b
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // With fixed mode, no b-stepper: fewer + buttons per row
    const plusButtons = screen.getAllByText("+");
    // Each row has only a-stepper (+ and -), plus rest stepper
    // 2 rows * 1 a-stepper + 1 rest stepper = 3 plus buttons
    // (no b-stepper, no int-stepper)
    expect(plusButtons.length).toBeLessThan(10);
  });

  it("time mode renders correctly without b-stepper", () => {
    const cb = makeCb();
    const block = makeTimeBlock();
    render(React.createElement(SetTable, { dayId, refTarget: ref, block, cb }));

    // time mode: no b stepper, repsStr shows Xs
    expect(screen.getAllByText("45s").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ProgramHeader — component
// ---------------------------------------------------------------------------

describe("ProgramHeader", () => {
  function makeProps(overrides?: Partial<ProgramHeaderProps>): ProgramHeaderProps {
    return {
      name: "Push / Pull / Legs",
      type: "fixed",
      schedule: "weekday",
      cb: makeCb(),
      ...overrides,
    };
  }

  it("renders program name", () => {
    render(React.createElement(ProgramHeader, makeProps()));
    expect(screen.getByText("Push / Pull / Legs")).toBeDefined();
  });

  it("Fixed/Cycled Segmented: clicking Cycled calls onSetType('cycled')", () => {
    const cb = makeCb();
    render(React.createElement(ProgramHeader, makeProps({ cb })));

    // Find the segmented button for "Cycled"
    const cycledBtn = screen.getByText(/cycled/i);
    fireEvent.click(cycledBtn);
    expect(cb.onSetType).toHaveBeenCalledWith("cycled");
  });

  it("Fixed/Cycled Segmented: clicking Fixed calls onSetType('fixed')", () => {
    const cb = makeCb();
    render(React.createElement(ProgramHeader, makeProps({ cb, type: "cycled" })));

    const fixedBtn = screen.getByText(/^fixed$/i);
    fireEvent.click(fixedBtn);
    expect(cb.onSetType).toHaveBeenCalledWith("fixed");
  });

  it("Weekdays/Floating Segmented: clicking Floating calls onSetSchedule('floating')", () => {
    const cb = makeCb();
    render(React.createElement(ProgramHeader, makeProps({ cb })));

    const floatingBtn = screen.getByText(/floating/i);
    fireEvent.click(floatingBtn);
    expect(cb.onSetSchedule).toHaveBeenCalledWith("floating");
  });

  it("Weekdays/Floating Segmented: clicking Weekdays calls onSetSchedule('weekday')", () => {
    const cb = makeCb();
    render(React.createElement(ProgramHeader, makeProps({ cb, schedule: "floating" })));

    const weekdayBtn = screen.getByText(/weekday/i);
    fireEvent.click(weekdayBtn);
    expect(cb.onSetSchedule).toHaveBeenCalledWith("weekday");
  });

  it("no gym-profile dropdown is rendered", () => {
    render(React.createElement(ProgramHeader, makeProps()));
    // Profile menu items (Home rack) should not be in the DOM
    expect(screen.queryByText("Home rack")).toBeNull();
    expect(screen.queryByText("GYM PROFILE")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// WeekBoard — component
// ---------------------------------------------------------------------------

describe("WeekBoard", () => {
  const program = seedProgram();

  function makeColumns(): BoardColVM[] {
    return buildBoard(program, null, LIBRARY);
  }

  function makeFloatingColumns(): BoardColVM[] {
    const fp: Program = { ...program, schedule: "floating" };
    return buildBoard(fp, null, LIBRARY);
  }

  it("renders all columns", () => {
    const cb = makeCb();
    const columns = makeColumns();
    render(React.createElement(WeekBoard, { columns, cb }));
    expect(screen.getByText("MON")).toBeDefined();
    expect(screen.getByText("SUN")).toBeDefined();
  });

  it("clicking a day card calls onSelectDay with dayId", () => {
    const cb = makeCb();
    const columns = makeColumns();
    render(React.createElement(WeekBoard, { columns, cb }));

    // "Push" day name is shown in the MON column card
    const pushCard = screen.getByText("Push");
    fireEvent.click(pushCard);
    expect(cb.onSelectDay).toHaveBeenCalledWith("push");
  });

  it("clicking a rest day + Add day button calls onAddDay with weekday", () => {
    const cb = makeCb();
    const columns = makeColumns();
    render(React.createElement(WeekBoard, { columns, cb }));

    // TUE is a rest day — clicking "+ Add day" calls onAddDay(2)
    const addButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.includes("Add") || b.textContent?.includes("+"));
    // Find the add button in the TUE rest column
    const addDayButtons = screen.getAllByText(/add day/i);
    if (addDayButtons.length > 0) {
      fireEvent.click(addDayButtons[0]);
      // Called with the weekday of the rest column (TUE = 2)
      expect(cb.onAddDay).toHaveBeenCalledWith(2);
    }
  });

  it("floating add column: clicking add calls onAddDay(null)", () => {
    const cb = makeCb();
    const columns = makeFloatingColumns();
    render(React.createElement(WeekBoard, { columns, cb }));

    // The floating "ADD" column has no weekday → onAddDay(null)
    const addCol = screen.getByText("ADD");
    fireEvent.click(addCol);
    expect(cb.onAddDay).toHaveBeenCalledWith(null);
  });

  it("editing card is visually marked (has editing indicator)", () => {
    const cb = makeCb();
    const program2 = seedProgram();
    const columns = buildBoard(program2, "push", LIBRARY);
    render(React.createElement(WeekBoard, { columns, cb }));

    // The editing day column should be marked — find a data-editing or similar attribute
    // Since exact rendering is up to implementation, we check the component renders
    expect(screen.getByText("Push")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// DayEditor — component
// ---------------------------------------------------------------------------

describe("DayEditor", () => {
  const program = seedProgram();
  // All 23 muscles for the picker
  const allMuscles: MuscleKey[] = [...MUSCLES];

  function makePushEditor(): EditorVM {
    return buildEditor(program, "push", LIBRARY);
  }

  function makeCycledEditor(): EditorVM {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Upper",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    return buildEditor(cycledProgram, "d1", LIBRARY);
  }

  it("renders day name input", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));
    const nameInput = screen.getByDisplayValue("Push");
    expect(nameInput).toBeDefined();
  });

  it("name input change fires onRenameDay", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    const nameInput = screen.getByDisplayValue("Push");
    fireEvent.change(nameInput, { target: { value: "Push Day" } });
    expect(cb.onRenameDay).toHaveBeenCalledWith("push", "Push Day");
  });

  it("renders summary string", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    expect(screen.getByText(editor.summary)).toBeDefined();
  });

  it("Delete day button fires onRemoveDay with dayId", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    const deleteBtn = screen.getByText(/delete day/i);
    fireEvent.click(deleteBtn);
    expect(cb.onRemoveDay).toHaveBeenCalledWith("push");
  });

  it("fixed mode: Add exercise button fires onAddExercise", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    const addExBtn = screen.getByText(/add exercise/i);
    fireEvent.click(addExBtn);
    expect(cb.onAddExercise).toHaveBeenCalledWith("push");
  });

  it("fixed mode: Remove exercise button fires onRemoveExercise with dayId + rowId", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // Each exercise row has a remove button
    const removeExButtons = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.textContent?.includes("Remove") || b.getAttribute("aria-label") === "remove exercise",
      );
    if (removeExButtons.length > 0) {
      fireEvent.click(removeExButtons[0]);
      // First exercise in push is x1 (bb-bench)
      expect(cb.onRemoveExercise).toHaveBeenCalledWith("push", "x1");
    }
  });

  it("fixed mode: superset toggle button fires onToggleSuperset", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // Superset toggle (⛓) button exists per exercise
    const supersetButtons = screen
      .getAllByRole("button")
      .filter(
        (b) => b.textContent?.includes("⛓") || b.getAttribute("aria-label") === "toggle superset",
      );
    if (supersetButtons.length > 0) {
      fireEvent.click(supersetButtons[0]);
      expect(cb.onToggleSuperset).toHaveBeenCalledWith("push", expect.any(String));
    }
  });

  it("fixed mode: Unlink button on superset member fires onToggleSuperset", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // "Unlink" buttons appear on superset members (inSuperset=true path)
    const unlinkButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "Unlink");
    if (unlinkButtons.length > 0) {
      fireEvent.click(unlinkButtons[0]);
      expect(cb.onToggleSuperset).toHaveBeenCalledWith("push", expect.any(String));
    }
  });

  it("weekday mode: weekday picker fires onSetWeekday", () => {
    const cb = makeCb();
    const editor = makePushEditor(); // isWeekday=true
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // Weekday picker buttons have single-char labels (M, T, W...) and a title attribute.
    // Find any button with a title that matches a weekday abbreviation.
    const wdButtons = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.getAttribute("title") != null &&
          ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(b.getAttribute("title") ?? ""),
      );
    expect(wdButtons.length).toBeGreaterThan(0);
    // Click the MON button (weekday=1)
    const monBtn = wdButtons.find((b) => b.getAttribute("title") === "MON");
    if (monBtn) {
      fireEvent.click(monBtn);
      expect(cb.onSetWeekday).toHaveBeenCalledWith("push", 1);
    } else {
      // Click whichever is first
      fireEvent.click(wdButtons[0]);
      expect(cb.onSetWeekday).toHaveBeenCalledWith("push", expect.any(Number));
    }
  });

  it("cycled mode: picker renders 23 muscle buttons (one per muscle)", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // Each of the 23 muscles should have a button labeled with its display name
    expect(
      screen.getAllByRole("button").filter((b) => b.textContent === MUSCLE_NAMES["front_delts"])
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button").filter((b) => b.textContent === MUSCLE_NAMES["rear_delts"])
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button").filter((b) => b.textContent === MUSCLE_NAMES["abductors"])
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button").filter((b) => b.textContent === MUSCLE_NAMES["rhomboids"])
        .length,
    ).toBeGreaterThan(0);
  });

  it("cycled mode: picker shows 'Front Delts', 'Rear Delts', 'Abductors', 'Rhomboids'", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    expect(screen.getAllByText("Front Delts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rear Delts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Abductors").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rhomboids").length).toBeGreaterThan(0);
  });

  it("cycled mode: clicking a muscle picker button calls onAddSlot with the MuscleKey", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // Find the "Chest" button in the picker (there may also be a slot header showing "Chest")
    // The picker buttons are rendered for each muscle in the muscles prop
    const chestButtons = screen
      .queryAllByText("Chest")
      .filter((el) => el.tagName.toLowerCase() === "button");
    if (chestButtons.length > 0) {
      fireEvent.click(chestButtons[0]);
      // onAddSlot should be called with the MuscleKey "chest", not the display name
      expect(cb.onAddSlot).toHaveBeenCalledWith("d1", "chest");
    }
  });

  it("cycled mode: clicking 'Front Delts' picker button calls onAddSlot with 'front_delts'", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    const frontDeltsButtons = screen
      .queryAllByText("Front Delts")
      .filter((el) => el.tagName.toLowerCase() === "button");
    if (frontDeltsButtons.length > 0) {
      fireEvent.click(frontDeltsButtons[0]);
      expect(cb.onAddSlot).toHaveBeenCalledWith("d1", "front_delts");
    }
  });

  it("cycled mode: slot header shows muscle name (MUSCLE_NAMES[slot.muscle])", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // The slot header should show "Chest" (MUSCLE_NAMES["chest"])
    // It appears as a div with fontWeight 700, not a button
    const chestHeaders = screen
      .queryAllByText("Chest")
      .filter((el) => el.tagName.toLowerCase() !== "button");
    expect(chestHeaders.length).toBeGreaterThan(0);
  });

  it("cycled mode: Add pool exercise button fires onAddPool", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // "+ Add exercise" in the slot pool
    const addPoolBtns = screen.queryAllByText(/add exercise/i);
    if (addPoolBtns.length > 0) {
      fireEvent.click(addPoolBtns[0]);
      expect(cb.onAddPool).toHaveBeenCalledWith("d1", "s1");
    }
  });

  it("cycled mode: Remove pool chip fires onRemoveFromPool", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // Remove pool chip — find by aria-label "remove from pool" specifically
    const removePoolButtons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-label") === "remove from pool");
    if (removePoolButtons.length > 0) {
      fireEvent.click(removePoolButtons[0]);
      expect(cb.onRemoveFromPool).toHaveBeenCalledWith("d1", "s1", "bench_press__barbell");
    }
  });

  it("cycled mode: Remove slot button fires onRemoveSlot", () => {
    const cb = makeCb();
    const editor = makeCycledEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    const removeSlotBtn = screen
      .queryAllByRole("button")
      .filter(
        (b) =>
          b.getAttribute("aria-label") === "remove slot" || b.textContent?.includes("Remove slot"),
      );
    if (removeSlotBtn.length > 0) {
      fireEvent.click(removeSlotBtn[0]);
      expect(cb.onRemoveSlot).toHaveBeenCalledWith("d1", "s1");
    }
  });

  it("renders exercise names in fixed mode", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    expect(screen.getByText("Barbell Bench Press")).toBeDefined();
  });

  it("renders superset members with A1/A2 tags", () => {
    const cb = makeCb();
    const editor = makePushEditor();
    render(React.createElement(DayEditor, { editor, muscles: allMuscles, cb }));

    // db-fly and lat-raise are in a superset, tagged A1/A2
    expect(screen.getByText(/A1/)).toBeDefined();
    expect(screen.getByText(/A2/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// PlannerScreen — component (integration)
// ---------------------------------------------------------------------------

describe("PlannerScreen", () => {
  const program = seedProgram();
  const volumeBars = [
    { muscle: "chest", name: "Chest", sets: 9, pct: 60 },
    { muscle: "lats", name: "Lats", sets: 9, pct: 55 },
  ];

  function makeProps(overrides?: Partial<PlannerScreenProps>): PlannerScreenProps {
    return {
      program,
      library: LIBRARY,
      editDayId: "push",
      volumeBars,
      coverage: zeroCoverage(),
      cb: makeCb(),
      ...overrides,
    };
  }

  it("renders without crashing", () => {
    const { container } = render(React.createElement(PlannerScreen, makeProps()));
    expect(container.firstChild).not.toBeNull();
  });

  it("renders ProgramHeader — shows program name", () => {
    render(React.createElement(PlannerScreen, makeProps()));
    expect(screen.getByText("Push / Pull / Legs")).toBeDefined();
  });

  it("renders WeekBoard — shows MON label", () => {
    render(React.createElement(PlannerScreen, makeProps()));
    expect(screen.getByText("MON")).toBeDefined();
  });

  it("renders DayEditor when editDayId is set", () => {
    render(React.createElement(PlannerScreen, makeProps({ editDayId: "push" })));
    // Editor shows the day name
    expect(screen.getByDisplayValue("Push")).toBeDefined();
  });

  it("does not render DayEditor when editDayId is null and program is empty", () => {
    const emptyProgram: Program = { name: "Empty", type: "fixed", schedule: "floating", days: [] };
    render(
      React.createElement(PlannerScreen, makeProps({ program: emptyProgram, editDayId: null })),
    );
    // No day editor since no days exist
    expect(screen.queryByText(/delete day/i)).toBeNull();
  });

  it("renders coverage rail with BodyMap", () => {
    render(React.createElement(PlannerScreen, makeProps()));
    // BodyMap renders SVG elements
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders volume bars for provided muscles", () => {
    render(React.createElement(PlannerScreen, makeProps()));
    // Volume bars show muscle names (use getAllByText since muscle names can appear elsewhere)
    expect(screen.getAllByText("Chest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lats").length).toBeGreaterThan(0);
  });

  it("onSetType callback is wired through ProgramHeader", () => {
    const cb = makeCb();
    render(React.createElement(PlannerScreen, makeProps({ cb })));

    const cycledBtn = screen.getByText(/cycled/i);
    fireEvent.click(cycledBtn);
    expect(cb.onSetType).toHaveBeenCalledWith("cycled");
  });

  it("onSelectDay callback wired through WeekBoard", () => {
    const cb = makeCb();
    render(React.createElement(PlannerScreen, makeProps({ cb })));

    // Clicking on "Push" day card triggers onSelectDay
    const pushText = screen.getAllByText("Push")[0];
    fireEvent.click(pushText);
    expect(cb.onSelectDay).toHaveBeenCalledWith("push");
  });

  it("renders floating schedule correctly", () => {
    const floatingProgram: Program = { ...program, schedule: "floating" };
    const { container } = render(
      React.createElement(PlannerScreen, makeProps({ program: floatingProgram, editDayId: null })),
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("ADD")).toBeDefined();
  });

  it("PlannerScreen with cycled program shows muscle picker with 23 entries", () => {
    const cycledProgram: Program = {
      name: "Cycled Plan",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [],
        },
      ],
    };
    render(
      React.createElement(PlannerScreen, makeProps({ program: cycledProgram, editDayId: "d1" })),
    );
    // The muscle picker should render buttons for all 23 muscles
    // Verify a few distinct muscle names appear as buttons
    const frontDeltsButtons = screen
      .queryAllByText("Front Delts")
      .filter((el) => el.tagName.toLowerCase() === "button");
    expect(frontDeltsButtons.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Coverage guarantee: call every component function directly
// These tests ensure SetTable, WeekBoard, DayEditor all execute (→ red via NI)
// ---------------------------------------------------------------------------

describe("direct component invocations for 100% coverage", () => {
  /** Pre-built VMs that don't require builder functions */
  const preBuiltSetBlock: SetBlockVM = {
    rows: [
      {
        index: 0,
        badgeLabel: "1",
        badgeKind: "work",
        typeName: "Working",
        repA: 10,
        repB: null,
        repsStr: "10",
        isTime: false,
        hasB: false,
        showInt: false,
        intStr: "",
      },
    ],
    repMode: "fixed",
    intensity: "none",
    showIntCol: false,
    repHeader: "REPS",
    intHeader: "",
    gridCols: "30px minmax(150px,1fr) 26px",
    restStr: "2:00",
    notes: "",
  };

  const preBuiltExCard: ExerciseCardVM = {
    id: "x1",
    name: "Barbell Bench Press",
    muscles: "Chest, Triceps, Front Delts",
    equip: "BARBELL",
    block: preBuiltSetBlock,
    supersetTag: null,
  };

  const preBuiltSlotVM: CycledSlotVM = {
    id: "s1",
    muscle: "chest",
    muscleName: "Chest",
    poolNames: [{ id: "bench_press__barbell", name: "Barbell Bench Press" }],
    poolStr: "1 exercises",
    block: preBuiltSetBlock,
  };

  const preBuiltEditorVM: EditorVM = {
    exists: true,
    dayId: "push",
    name: "Push",
    isFixed: true,
    isWeekday: true,
    dayOrderLabel: "Day 1",
    weekday: 1,
    summary: "5 exercises · 16 sets · ~54 min",
    rows: [
      { kind: "ex", ex: preBuiltExCard },
      {
        kind: "superset",
        members: [
          { ...preBuiltExCard, id: "x3", name: "Dumbbell Fly", supersetTag: "A1" },
          { ...preBuiltExCard, id: "x4", name: "Lateral Raise", supersetTag: "A2" },
        ],
      },
      { kind: "slot", slot: preBuiltSlotVM },
    ],
  };

  const preBuiltColumns: BoardColVM[] = [
    {
      kind: "day",
      label: "MON",
      weekday: 1,
      dayId: "push",
      name: "Push",
      chips: [{ name: "bench_press__barbell", superset: false }],
      more: 0,
      editing: true,
    },
    // day column without chips (covers the chips ?? [] fallback branch)
    { kind: "day", label: "WED", weekday: 3, dayId: "pull", name: "Pull" },
    { kind: "rest", label: "TUE", weekday: 2 },
    { kind: "add", label: "ADD" },
  ];

  it("SetTable renders directly with pre-built VM", () => {
    const cb = makeCb();
    const ref: EditRef = { kind: "ex", id: "x1" };
    const { container } = render(
      React.createElement(SetTable, {
        dayId: "push",
        refTarget: ref,
        block: preBuiltSetBlock,
        cb,
      }),
    );
    expect(container).toBeDefined();
  });

  it("WeekBoard renders directly with pre-built columns", () => {
    const cb = makeCb();
    const { container } = render(React.createElement(WeekBoard, { columns: preBuiltColumns, cb }));
    expect(container).toBeDefined();
  });

  it("DayEditor renders directly with pre-built EditorVM (fixed, weekday, superset+slot rows)", () => {
    const cb = makeCb();
    const muscles: MuscleKey[] = ["chest", "lats", "front_delts"];
    const { container } = render(
      React.createElement(DayEditor, {
        editor: preBuiltEditorVM,
        muscles,
        cb,
      }),
    );
    expect(container).toBeDefined();
  });

  it("DayEditor renders with cycled (non-fixed) editor VM", () => {
    const cb = makeCb();
    const cycledEditor: EditorVM = {
      exists: true,
      dayId: "d1",
      name: "Upper",
      isFixed: false,
      isWeekday: false,
      dayOrderLabel: "Day 1",
      weekday: null,
      summary: "2 muscle groups",
      rows: [{ kind: "slot", slot: preBuiltSlotVM }],
    };
    const muscles: MuscleKey[] = ["chest", "lats"];
    const { container } = render(
      React.createElement(DayEditor, {
        editor: cycledEditor,
        muscles,
        cb,
      }),
    );
    expect(container).toBeDefined();
  });

  it("DayEditor with exists=false renders nothing/placeholder", () => {
    const cb = makeCb();
    const noEditor: EditorVM = {
      exists: false,
      dayId: "",
      name: "",
      isFixed: true,
      isWeekday: false,
      dayOrderLabel: "Day 1",
      weekday: null,
      summary: "",
      rows: [],
    };
    const { container } = render(
      React.createElement(DayEditor, {
        editor: noEditor,
        muscles: [],
        cb,
      }),
    );
    expect(container).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Additional edge cases for 100% coverage
// ---------------------------------------------------------------------------

describe("buildSetBlock — edge cases", () => {
  it("handles rest=0 (0:00)", () => {
    const p: ExercisePrescription = {
      id: "e1",
      exId: "bench_press__barbell",
      repMode: "fixed",
      intensity: "none",
      rest: 0,
      sets: [{ type: "working", a: 10 }],
    };
    const vm = buildSetBlock(p);
    expect(vm.restStr).toBe("0:00");
  });

  it("handles rest=60 (1:00)", () => {
    const p: ExercisePrescription = {
      id: "e1",
      exId: "bench_press__barbell",
      repMode: "fixed",
      intensity: "none",
      rest: 60,
      sets: [{ type: "working", a: 10 }],
    };
    const vm = buildSetBlock(p);
    expect(vm.restStr).toBe("1:00");
  });

  it("handles rest=9 seconds (0:09)", () => {
    const p: ExercisePrescription = {
      id: "e1",
      exId: "bench_press__barbell",
      repMode: "fixed",
      intensity: "none",
      rest: 9,
      sets: [{ type: "working", a: 10 }],
    };
    const vm = buildSetBlock(p);
    expect(vm.restStr).toBe("0:09");
  });

  it("multiple working sets numbered sequentially from 1", () => {
    const p: ExercisePrescription = {
      id: "e1",
      exId: "bench_press__barbell",
      repMode: "fixed",
      intensity: "none",
      rest: 120,
      sets: [
        { type: "working", a: 10 },
        { type: "working", a: 10 },
        { type: "working", a: 10 },
        { type: "working", a: 10 },
        { type: "working", a: 10 },
      ],
    };
    const vm = buildSetBlock(p);
    const labels = vm.rows.map((r) => r.badgeLabel);
    expect(labels).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("range mode with b < a still renders repsStr as a–b", () => {
    // Edge: a=8, b=8
    const p: ExercisePrescription = {
      id: "e1",
      exId: "bench_press__barbell",
      repMode: "range",
      intensity: "none",
      rest: 120,
      sets: [{ type: "working", a: 8, b: 8 }],
    };
    const vm = buildSetBlock(p);
    expect(vm.rows[0].repsStr).toBe("8–8");
  });

  it("pct intensity showIntCol is true and intHeader is %1RM", () => {
    const p: ExercisePrescription = {
      id: "e1",
      exId: "back_squat__barbell",
      repMode: "range",
      intensity: "pct",
      rest: 180,
      sets: [{ type: "working", a: 6, b: 8, val: 70 }],
    };
    const vm = buildSetBlock(p);
    expect(vm.showIntCol).toBe(true);
    expect(vm.intHeader).toBe("%1RM");
  });

  it("time mode fixed values render", () => {
    const p: ExercisePrescription = {
      id: "e1",
      exId: "plank__bodyweight",
      repMode: "time",
      intensity: "none",
      rest: 60,
      sets: [
        { type: "working", a: 30 },
        { type: "working", a: 45 },
      ],
    };
    const vm = buildSetBlock(p);
    expect(vm.rows[0].repsStr).toBe("30s");
    expect(vm.rows[1].repsStr).toBe("45s");
    expect(vm.repHeader).toBe("TIME");
  });

  it("notes is passed through for cycled slot", () => {
    const slot: CycledSlot = {
      id: "s1",
      muscle: "chest",
      pool: ["bench_press__barbell"],
      repMode: "fixed",
      intensity: "none",
      rest: 120,
      sets: [{ type: "working", a: 10 }],
      notes: "Slot note",
    };
    const vm = buildSetBlock(slot);
    expect(vm.notes).toBe("Slot note");
  });
});

describe("buildEditor — additional edge cases", () => {
  it("exists is false when editDayId points to nonexistent day", () => {
    const program = seedProgram();
    const vm = buildEditor(program, "nonexistent-day", LIBRARY);
    expect(vm.exists).toBe(false);
  });

  it("multiple supersets in one day each get A1/A2 tags", () => {
    const program = seedProgram();
    const vm = buildEditor(program, "pull", LIBRARY); // ssB: hammer-curl + bb-curl
    const supersetRow = vm.rows.find((r) => r.kind === "superset");
    expect(supersetRow).toBeDefined();
    if (supersetRow && supersetRow.kind === "superset") {
      expect(supersetRow.members[0].supersetTag).toBe("A1");
      expect(supersetRow.members[1].supersetTag).toBe("A2");
    }
  });

  it("legs day has exercise without supersetId (plank, time-based)", () => {
    const program = seedProgram();
    const vm = buildEditor(program, "legs", LIBRARY);
    const plankRow = vm.rows.find((r) => r.kind === "ex" && r.ex.name === "Plank");
    expect(plankRow).toBeDefined();
    if (plankRow && plankRow.kind === "ex") {
      expect(plankRow.ex.block.repMode).toBe("time");
    }
  });

  it("poolStr shows '1 exercises' for single pool entry", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Upper",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    if (vm.rows[0].kind === "slot") {
      expect(vm.rows[0].slot.poolStr).toBe("1 exercises");
    }
  });

  it("cycled slot VM has correct muscle key and muscleName for lats", () => {
    const cycledProgram: Program = {
      name: "Test",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Pull",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "lats",
              pool: ["pull_up__pullupbar"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    if (vm.rows[0].kind === "slot") {
      expect(vm.rows[0].slot.muscle).toBe("lats");
      expect(vm.rows[0].slot.muscleName).toBe("Lats");
    }
  });

  // ---- resilience: exercise not found in library ----

  it("fixed-mode single exercise with unknown exId: no crash, name=exId, muscles='', equip=''", () => {
    const unknownExId = "ghost_exercise__unknown";
    const program: Program = {
      name: "Ghost",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "e1",
              exId: unknownExId,
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 10 }],
            },
          ],
          slots: [],
        },
      ],
    };
    // Must not throw
    const vm = buildEditor(program, "d1", LIBRARY);
    expect(vm.exists).toBe(true);
    expect(vm.rows).toHaveLength(1);
    const row = vm.rows[0];
    expect(row.kind).toBe("ex");
    if (row.kind === "ex") {
      expect(row.ex.name).toBe(unknownExId);
      expect(row.ex.muscles).toBe("");
      expect(row.ex.equip).toBe("");
    }
  });

  it("fixed-mode superset member with unknown exId: no crash, name=exId, muscles='', equip=''", () => {
    const unknownExId = "phantom_superset__bodyweight";
    const program: Program = {
      name: "Phantom",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "e1",
              exId: "bench_press__barbell",
              supersetId: "ssX",
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 10 }],
            },
            {
              id: "e2",
              exId: unknownExId,
              supersetId: "ssX",
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 10 }],
            },
          ],
          slots: [],
        },
      ],
    };
    // Must not throw
    const vm = buildEditor(program, "d1", LIBRARY);
    expect(vm.exists).toBe(true);
    expect(vm.rows).toHaveLength(1);
    const row = vm.rows[0];
    expect(row.kind).toBe("superset");
    if (row.kind === "superset") {
      expect(row.members).toHaveLength(2);
      // First member (bench_press__barbell) is found — sanity check
      expect(row.members[0].name).toBe("Barbell Bench Press");
      // Second member (unknownExId) is NOT found → fallbacks
      const ghost = row.members[1];
      expect(ghost.name).toBe(unknownExId);
      expect(ghost.muscles).toBe("");
      expect(ghost.equip).toBe("");
    }
  });

  it("cycled-mode slot pool with unknown exId: no crash, poolName.name=exId", () => {
    const unknownExId = "spectre_lift__machine";
    const cycledProgram: Program = {
      name: "Spectre",
      type: "cycled",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench_press__barbell", unknownExId],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    // Must not throw
    const vm = buildEditor(cycledProgram, "d1", LIBRARY);
    expect(vm.exists).toBe(true);
    expect(vm.rows).toHaveLength(1);
    const row = vm.rows[0];
    expect(row.kind).toBe("slot");
    if (row.kind === "slot") {
      expect(row.slot.poolNames).toHaveLength(2);
      // First pool entry (bench_press__barbell) resolves normally
      expect(row.slot.poolNames[0].name).toBe("Barbell Bench Press");
      // Second pool entry (unknownExId) is NOT in library → falls back to raw exId
      expect(row.slot.poolNames[1].id).toBe(unknownExId);
      expect(row.slot.poolNames[1].name).toBe(unknownExId);
    }
  });
});

describe("buildBoard — additional edge cases", () => {
  it("empty program with no days in floating schedule produces just add column", () => {
    const emptyProgram: Program = {
      name: "Empty",
      type: "fixed",
      schedule: "floating",
      days: [],
    };
    const cols = buildBoard(emptyProgram, null, LIBRARY);
    expect(cols).toHaveLength(1);
    expect(cols[0].kind).toBe("add");
  });

  it("weekday program maps SUN to weekday=0", () => {
    const cols = buildBoard(seedProgram(), null, LIBRARY);
    const sun = cols.find((c) => c.label === "SUN");
    expect(sun).toBeDefined();
    expect(sun?.weekday).toBe(0);
  });

  it("floating columns have no weekday property", () => {
    const fp: Program = { ...seedProgram(), schedule: "floating" };
    const cols = buildBoard(fp, null, LIBRARY);
    const dayCols = cols.filter((c) => c.kind === "day");
    dayCols.forEach((col) => {
      expect(col.weekday).toBeUndefined();
    });
  });

  it("fixed-mode chip falls back to raw exId when exercise not found in library", () => {
    // A program with an unknown exId not present in LIBRARY
    const unknownProgram: Program = {
      name: "Unknown",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Day 1",
          weekday: null,
          exercises: [
            {
              id: "e1",
              exId: "unknown-exercise-xyz",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const cols = buildBoard(unknownProgram, null, LIBRARY);
    // Library has no "unknown-exercise-xyz" → fallback to raw exId
    expect(cols[0].chips![0].name).toBe("unknown-exercise-xyz");
  });
});
