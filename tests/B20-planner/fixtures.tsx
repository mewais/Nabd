// Shared fixtures for the planner suites: two realistic programs and a harness
// that applies every `cb.onEdit(edit)` to a real ProgramEditor, so tests can
// assert on the program a click produces instead of on how the UI asked for it.

import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { Coverage, Program } from "@nabd/domain";
import { MUSCLES } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { ProgramEditor } from "@nabd/program-editor";
import type { ProgramEdit } from "@nabd/program-editor";
import { PlannerScreen } from "@nabd/planner";
import type { PlannerCallbacks } from "@nabd/planner";

export const library = ExerciseLibrary.catalog;

export const BENCH = "bench_press__barbell";
export const DB_BENCH = "bench_press__dumbbell";
export const PUSH_UP = "push_up__bodyweight";
export const OHP = "overhead_press__barbell";
export const PLANK = "plank__bodyweight";
export const PULL_UP = "pull_up__pullupbar";
export const PULLDOWN = "lat_pulldown__cable";
export const DEADLIFT = "deadlift__barbell";

/** Every catalog id the fixtures rely on (guarded by a test). */
export const FIXTURE_EXERCISE_IDS = [
  BENCH,
  DB_BENCH,
  PUSH_UP,
  OHP,
  PLANK,
  PULL_UP,
  PULLDOWN,
  DEADLIFT,
];

/**
 * Fixed plan on weekdays.
 *   Mon "Push": bench (range + RPE, W/1/2/D), overhead press (fixed + %1RM), plank (time).
 *   Wed "Pull": pull-up + pulldown as a superset, then deadlift.
 */
export function fixedProgram(): Program {
  return {
    name: "Office Strength",
    type: "fixed",
    schedule: "weekday",
    days: [
      {
        id: "d-push",
        name: "Push",
        weekday: 1,
        slots: [],
        exercises: [
          {
            id: "e-bench",
            exId: BENCH,
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            notes: "Pause on the chest",
            sets: [
              { type: "warmup", a: 10, b: 12, val: 6 },
              { type: "working", a: 8, b: 10, val: 8 },
              { type: "working", a: 6, b: 8, val: 8.5 },
              { type: "drop", a: 12, b: 15, val: 9 },
            ],
          },
          {
            id: "e-ohp",
            exId: OHP,
            repMode: "fixed",
            intensity: "pct",
            rest: 120,
            sets: [
              { type: "working", a: 5, val: 70 },
              { type: "working", a: 5, val: 72.5 },
              { type: "working", a: 5, val: 75 },
            ],
          },
          {
            id: "e-plank",
            exId: PLANK,
            repMode: "time",
            intensity: "none",
            rest: 45,
            sets: [
              { type: "working", a: 45 },
              { type: "working", a: 60 },
            ],
          },
        ],
      },
      {
        id: "d-pull",
        name: "Pull",
        weekday: 3,
        slots: [],
        exercises: [
          {
            id: "e-pullup",
            exId: PULL_UP,
            supersetId: "ss-1",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [
              { type: "working", a: 6, b: 10 },
              { type: "working", a: 6, b: 10 },
            ],
          },
          {
            id: "e-pulldown",
            exId: PULLDOWN,
            supersetId: "ss-1",
            repMode: "range",
            intensity: "none",
            rest: 90,
            sets: [
              { type: "working", a: 10, b: 12 },
              { type: "working", a: 10, b: 12 },
            ],
          },
          {
            id: "e-deadlift",
            exId: DEADLIFT,
            repMode: "fixed",
            intensity: "none",
            rest: 180,
            sets: [{ type: "working", a: 5 }],
          },
        ],
      },
    ],
  };
}

/** Cycled plan on weekdays: Mon "Upper" (chest + lats slots), Thu "Core" (abs slot). */
export function cycledProgram(): Program {
  return {
    name: "Rotation",
    type: "cycled",
    schedule: "weekday",
    days: [
      {
        id: "d-upper",
        name: "Upper",
        weekday: 1,
        exercises: [],
        slots: [
          {
            id: "s-chest",
            muscle: "chest",
            pool: [BENCH, DB_BENCH, PUSH_UP],
            repMode: "range",
            intensity: "none",
            rest: 120,
            sets: [
              { type: "working", a: 8, b: 12 },
              { type: "working", a: 8, b: 12 },
              { type: "working", a: 8, b: 12 },
            ],
          },
          {
            id: "s-lats",
            muscle: "lats",
            pool: [PULL_UP, PULLDOWN],
            repMode: "range",
            intensity: "none",
            rest: 105,
            sets: [
              { type: "working", a: 6, b: 10 },
              { type: "working", a: 6, b: 10 },
            ],
          },
        ],
      },
      {
        id: "d-core",
        name: "Core",
        weekday: 4,
        exercises: [],
        slots: [
          {
            id: "s-abs",
            muscle: "abs",
            pool: [PLANK],
            repMode: "time",
            intensity: "none",
            rest: 60,
            sets: [{ type: "working", a: 45 }],
          },
        ],
      },
    ],
  };
}

export const floating = (program: Program): Program => ({
  ...program,
  schedule: "floating",
  days: program.days.map((day) => ({ ...day, weekday: null })),
});

export const NO_COVERAGE = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Coverage;

export interface EditSink {
  cb: {
    [K in keyof PlannerCallbacks]: PlannerCallbacks[K] & ReturnType<typeof vi.fn>;
  };
  /** The program after every edit received so far. */
  readonly program: Program;
  /** How many edits have been received. */
  readonly edits: number;
}

/**
 * Planner callbacks whose `onEdit` runs each edit against a real ProgramEditor
 * (ids "new-1", "new-2", … and the catalog as the exercise lookup).
 */
export function editSink(initial: Program, onChange?: (next: Program) => void): EditSink {
  let current = initial;
  let nextId = 0;
  const newId = (): string => `new-${++nextId}`;
  const onEdit = vi.fn((edit: ProgramEdit) => {
    current = edit(new ProgramEditor(current, newId, (exId) => library.byId(exId)));
    onChange?.(current);
  });
  return {
    cb: {
      onEdit,
      onSelectDay: vi.fn(),
      onAddExercise: vi.fn(),
      onAddPool: vi.fn(),
    },
    get program() {
      return current;
    },
    get edits() {
      return onEdit.mock.calls.length;
    },
  };
}

/**
 * Render the whole planner the way the app drives it: edits update the program
 * and re-render, selecting a day on the board makes it the edited day.
 */
export function renderPlanner(
  initial: Program,
  options: {
    editDayId?: string | null;
    volumeBars?: { muscle: string; name: string; sets: number; pct: number }[];
  } = {},
) {
  let sink!: EditSink;

  function Harness(): JSX.Element {
    const [program, setProgram] = React.useState(initial);
    const [editDayId, setEditDayId] = React.useState(options.editDayId ?? null);
    const [ownSink] = React.useState(() => {
      const created = editSink(initial, setProgram);
      created.cb.onSelectDay.mockImplementation(setEditDayId);
      return created;
    });
    sink = ownSink;
    return (
      <PlannerScreen
        program={program}
        library={library}
        editDayId={editDayId}
        volumeBars={options.volumeBars ?? []}
        coverage={NO_COVERAGE}
        cb={ownSink.cb}
      />
    );
  }

  const view = render(<Harness />);
  return {
    ...view,
    cb: sink.cb,
    /** The latest program (after every edit so far). */
    program: (): Program => sink.program,
    edits: (): number => sink.edits,
  };
}

/** Find a day by id, failing loudly if it is gone. */
export function dayOf(program: Program, dayId: string) {
  const day = program.days.find((d) => d.id === dayId);
  if (!day) throw new Error(`day ${dayId} not in program`);
  return day;
}
