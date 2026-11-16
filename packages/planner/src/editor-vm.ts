// The day being edited: its header and one row per exercise, superset or slot.

import type {
  CycledSlot,
  Day,
  ExerciseLookup,
  MuscleKey,
  Program,
  ProgramType,
} from "@nabd/domain";
import { EQUIPMENT_NAMES, MUSCLE_NAMES, muscleNames, plural, supersetTags } from "@nabd/domain";
import { daySummary } from "@nabd/program-editor";
import { buildSetBlock } from "./set-block-vm";
import type { SetBlockVM } from "./set-block-vm";

export interface ExerciseCardVM {
  id: string;
  name: string;
  /** "Chest, Front Delts, Triceps" */
  muscles: string;
  /** "BARBELL"; empty when the library no longer has the exercise. */
  equipment: string;
  block: SetBlockVM;
  /** "A1"/"A2" within the day's first superset, "B1"/"B2" within its second…; else null. */
  supersetTag: string | null;
}

export interface SlotCardVM {
  id: string;
  muscle: MuscleKey;
  muscleName: string;
  /** "Targets Chest · cycles its pool" */
  hint: string;
  /** "Exercise pool · 3 exercises" */
  poolLabel: string;
  pool: { id: string; name: string }[];
  block: SetBlockVM;
}

/** One row of the day. `id` is unique within it: a superset goes by its first member's. */
export type EditorRowVM =
  | { kind: "exercise"; id: string; exercise: ExerciseCardVM }
  | { kind: "superset"; id: string; members: ExerciseCardVM[] }
  | { kind: "slot"; id: string; slot: SlotCardVM };

/** Where the day sits: on a weekday, or at a position in the floating order. */
export type DayPlacementVM =
  | { kind: "weekday"; weekday: number | null }
  | { kind: "floating"; label: string };

export interface EditorVM {
  dayId: string;
  name: string;
  /** Decides what can be added: exercises (fixed) or muscle slots (cycled). */
  type: ProgramType;
  placement: DayPlacementVM;
  /** "5 exercises · 16 sets" */
  summary: string;
  rows: EditorRowVM[];
}

/** The day the editor shows: the selected one, else the first; undefined in an empty plan. */
export function resolveEditDay(program: Program, editDayId: string | null): Day | undefined {
  return program.days.find((day) => day.id === editDayId) ?? program.days[0];
}

function exerciseCard(
  row: Day["exercises"][number],
  supersetTag: string | null,
  lookup: ExerciseLookup,
): ExerciseCardVM {
  const exercise = lookup(row.exId);
  return {
    id: row.id,
    name: exercise?.name ?? row.exId,
    muscles: exercise ? muscleNames(exercise).join(", ") : "",
    equipment: exercise ? EQUIPMENT_NAMES[exercise.equipment].toUpperCase() : "",
    block: buildSetBlock(row),
    supersetTag,
  };
}

/** Fixed-day rows, with neighbouring members of a superset gathered into one group. */
function exerciseRows(day: Day, lookup: ExerciseLookup): EditorRowVM[] {
  const tags = supersetTags(day.exercises);
  const rows: EditorRowVM[] = [];
  let open: { supersetId: string; members: ExerciseCardVM[] } | null = null;
  day.exercises.forEach((row, index) => {
    const card = exerciseCard(row, tags[index] ?? null, lookup);
    if (row.supersetId === undefined) {
      open = null;
      rows.push({ kind: "exercise", id: row.id, exercise: card });
    } else if (open?.supersetId === row.supersetId) {
      open.members.push(card);
    } else {
      open = { supersetId: row.supersetId, members: [card] };
      rows.push({ kind: "superset", id: row.id, members: open.members });
    }
  });
  return rows;
}

function slotRow(slot: CycledSlot, lookup: ExerciseLookup): EditorRowVM {
  const muscleName = MUSCLE_NAMES[slot.muscle];
  return {
    kind: "slot",
    id: slot.id,
    slot: {
      id: slot.id,
      muscle: slot.muscle,
      muscleName,
      hint: `Targets ${muscleName} · cycles its pool`,
      poolLabel: `Exercise pool · ${plural(slot.pool.length, "exercise")}`,
      pool: slot.pool.map((id) => ({ id, name: lookup(id)?.name ?? id })),
      block: buildSetBlock(slot),
    },
  };
}

export function buildEditor(program: Program, day: Day, lookup: ExerciseLookup): EditorVM {
  return {
    dayId: day.id,
    name: day.name,
    type: program.type,
    placement:
      program.schedule === "weekday"
        ? { kind: "weekday", weekday: day.weekday }
        : { kind: "floating", label: `Day ${program.days.indexOf(day) + 1} · floating` },
    summary: daySummary(day, program.type),
    rows:
      program.type === "fixed"
        ? exerciseRows(day, lookup)
        : day.slots.map((slot) => slotRow(slot, lookup)),
  };
}
