// Pure builders: the program in, exactly what the planner renders out.

import type {
  CycledSlot,
  Day,
  Intensity,
  MuscleKey,
  Prescription,
  Program,
  RepMode,
} from "@nabd/domain";
import { EQUIPMENT_NAMES, MUSCLE_NAMES } from "@nabd/domain";
import type { ExerciseLibrary } from "@nabd/dataset";
import { WEEK_ORDER, daySummary } from "@nabd/program-editor";

export interface SetRowVM {
  index: number;
  /** "W" / "1".. / "D" */
  badgeLabel: string;
  badgeKind: "warm" | "work" | "drop";
  typeName: string;
  repA: number;
  repB: number | null;
  /** "8–10" / "12" / "45s" */
  repsStr: string;
  isTime: boolean;
  hasB: boolean;
  showInt: boolean;
  /** "8" / "70%" */
  intStr: string;
}

export interface SetBlockVM {
  rows: SetRowVM[];
  repMode: RepMode;
  intensity: Intensity;
  showIntCol: boolean;
  /** "REPS" / "TIME" */
  repHeader: string;
  /** "RPE" / "%1RM" / "" */
  intHeader: string;
  gridCols: string;
  /** "2:30" */
  restStr: string;
  notes: string;
}

const SET_BADGES = {
  warmup: { badgeKind: "warm", typeName: "Warm-up", badgeLabel: "W" },
  drop: { badgeKind: "drop", typeName: "Drop set", badgeLabel: "D" },
  working: { badgeKind: "work", typeName: "Working" },
} as const;

/** The set-table view model for an exercise prescription or a cycled slot. */
export function buildSetBlock(prescription: Prescription): SetBlockVM {
  const { repMode, intensity, rest, sets, notes } = prescription;
  const showIntCol = intensity !== "none";
  const isTime = repMode === "time";

  let workingCount = 0;
  const rows = sets.map((set, index): SetRowVM => {
    const repB = set.b ?? null;
    const hasB = repMode === "range" && repB !== null;
    return {
      index,
      badgeLabel: set.type === "working" ? String(++workingCount) : SET_BADGES[set.type].badgeLabel,
      badgeKind: SET_BADGES[set.type].badgeKind,
      typeName: SET_BADGES[set.type].typeName,
      repA: set.a,
      repB,
      repsStr: isTime ? `${set.a}s` : hasB ? `${set.a}–${repB}` : `${set.a}`,
      isTime,
      hasB,
      showInt: showIntCol,
      intStr:
        set.val === undefined || !showIntCol ? "" : `${set.val}${intensity === "pct" ? "%" : ""}`,
    };
  });

  return {
    rows,
    repMode,
    intensity,
    showIntCol,
    repHeader: isTime ? "TIME" : "REPS",
    intHeader: intensity === "rpe" ? "RPE" : intensity === "pct" ? "%1RM" : "",
    gridCols: showIntCol ? "30px minmax(150px,1fr) 86px 26px" : "30px minmax(150px,1fr) 26px",
    restStr: `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`,
    notes: notes ?? "",
  };
}

export interface ExerciseCardVM {
  id: string;
  name: string;
  muscles: string;
  equip: string;
  block: SetBlockVM;
  /** "A1"/"A2" within a superset, else null. */
  supersetTag: string | null;
}

export interface CycledSlotVM {
  id: string;
  muscle: MuscleKey;
  muscleName: string;
  poolNames: { id: string; name: string }[];
  poolStr: string;
  block: SetBlockVM;
}

export type EditorRow =
  | { kind: "ex"; ex: ExerciseCardVM }
  | { kind: "superset"; members: ExerciseCardVM[] }
  | { kind: "slot"; slot: CycledSlotVM };

export interface EditorVM {
  dayId: string;
  name: string;
  isFixed: boolean;
  isWeekday: boolean;
  /** "Day 2" — the day's position in a floating plan. */
  dayOrderLabel: string;
  weekday: number | null;
  summary: string;
  rows: EditorRow[];
}

function exerciseCard(
  row: Day["exercises"][number],
  library: ExerciseLibrary,
  supersetTag: string | null,
): ExerciseCardVM {
  const exercise = library.byId(row.exId);
  return {
    id: row.id,
    name: exercise?.name ?? row.exId,
    muscles: exercise
      ? [...exercise.primary, ...exercise.secondary].map((m) => MUSCLE_NAMES[m]).join(", ")
      : "",
    equip: exercise ? EQUIPMENT_NAMES[exercise.equipment].toUpperCase() : "",
    block: buildSetBlock(row),
    supersetTag,
  };
}

/** Fixed-day rows, with consecutive members of a superset gathered into one group. */
function fixedRows(day: Day, library: ExerciseLibrary): EditorRow[] {
  const rows: EditorRow[] = [];
  for (const row of day.exercises) {
    const last = rows.at(-1);
    const group =
      last?.kind === "superset" &&
      day.exercises.find((e) => e.id === last.members[0]!.id)?.supersetId === row.supersetId
        ? last
        : null;
    if (row.supersetId === undefined) {
      rows.push({ kind: "ex", ex: exerciseCard(row, library, null) });
    } else if (group) {
      group.members.push(exerciseCard(row, library, `A${group.members.length + 1}`));
    } else {
      rows.push({ kind: "superset", members: [exerciseCard(row, library, "A1")] });
    }
  }
  return rows;
}

function slotRow(slot: CycledSlot, library: ExerciseLibrary): EditorRow {
  return {
    kind: "slot",
    slot: {
      id: slot.id,
      muscle: slot.muscle,
      muscleName: MUSCLE_NAMES[slot.muscle],
      poolNames: slot.pool.map((id) => ({ id, name: library.byId(id)?.name ?? id })),
      poolStr: `${slot.pool.length} exercises`,
      block: buildSetBlock(slot),
    },
  };
}

/** The day being edited (default: the first day); null when there is nothing to edit. */
export function buildEditor(
  program: Program,
  editDayId: string | null,
  library: ExerciseLibrary,
): EditorVM | null {
  const day = program.days.find((d) => d.id === editDayId) ?? program.days[0];
  if (!day) return null;
  const isFixed = program.type === "fixed";
  return {
    dayId: day.id,
    name: day.name,
    isFixed,
    isWeekday: program.schedule === "weekday",
    dayOrderLabel: `Day ${program.days.indexOf(day) + 1}`,
    weekday: day.weekday,
    summary: daySummary(day, program.type),
    rows: isFixed ? fixedRows(day, library) : day.slots.map((slot) => slotRow(slot, library)),
  };
}

export interface BoardChip {
  name: string;
  superset: boolean;
}

/** One column of the week board: a day's card, a rest day, or the add button. */
export interface BoardColVM {
  kind: "day" | "rest" | "add";
  label: string;
  weekday?: number;
  dayId?: string;
  name?: string;
  chips?: BoardChip[];
  /** Entries that did not fit on the card. */
  more?: number;
  editing?: boolean;
}

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CHIPS_SHOWN = 4;

/** Mon–Sun columns for a weekday schedule; DAY 1..N plus an add column for floating. */
export function buildBoard(
  program: Program,
  editDayId: string | null,
  library: ExerciseLibrary,
): BoardColVM[] {
  const editing = buildEditor(program, editDayId, library)?.dayId;
  const dayColumn = (day: Day, label: string): BoardColVM => {
    const entries: BoardChip[] =
      program.type === "cycled"
        ? day.slots.map((s) => ({ name: MUSCLE_NAMES[s.muscle], superset: false }))
        : day.exercises.map((e) => ({
            name: library.byId(e.exId)?.name ?? e.exId,
            superset: e.supersetId !== undefined,
          }));
    return {
      kind: "day",
      label,
      dayId: day.id,
      name: day.name,
      chips: entries.slice(0, CHIPS_SHOWN),
      more: Math.max(0, entries.length - CHIPS_SHOWN),
      editing: day.id === editing,
    };
  };

  if (program.schedule === "weekday") {
    return WEEK_ORDER.map((weekday) => {
      const label = WEEKDAY_LABELS[weekday]!;
      const day = program.days.find((d) => d.weekday === weekday);
      return day ? { ...dayColumn(day, label), weekday } : { kind: "rest", label, weekday };
    });
  }
  return [
    ...program.days.map((day, i) => dayColumn(day, `DAY ${i + 1}`)),
    { kind: "add", label: "ADD" },
  ];
}
