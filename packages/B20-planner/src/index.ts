// @nabd/planner — Plan screen: program header, week board, day editor (fixed
// set tables + supersets + cycled slots), coverage rail. Pure view-model builders
// + presentational React. Mutations are callbacks (wired to the store in B23).

import React from "react";
import type {
  Program,
  ExercisePrescription,
  CycledSlot,
  MuscleGroup,
  GymProfile,
} from "@nabd/domain";
import { MUSCLE_NAMES, GROUP_PRIMARY_MUSCLE, EQUIPMENT_NAMES } from "@nabd/domain";
import type { Library } from "@nabd/dataset";
import { boardLayout, daySummary } from "@nabd/program-editor";
import { BodyMap } from "@nabd/bodymap";
import { Segmented, MiniStepper, Button } from "@nabd/design-system";

// ---------- view-model builders (pure) ----------

export interface SetRowVM {
  index: number;
  badgeLabel: string; // "W" / "1".. / "D"
  badgeKind: "warm" | "work" | "drop";
  typeName: string;
  repA: number;
  repB: number | null;
  repsStr: string; // "8–10" / "12" / "45s"
  isTime: boolean;
  hasB: boolean;
  showInt: boolean;
  intStr: string; // "8" / "70%"
}
export interface SetBlockVM {
  rows: SetRowVM[];
  repMode: import("@nabd/domain").RepMode;
  intensity: import("@nabd/domain").Intensity;
  showIntCol: boolean;
  repHeader: string; // "REPS" / "TIME"
  intHeader: string; // "RPE" / "%1RM" / ""
  gridCols: string;
  restStr: string; // "2:30"
  notes: string;
}

export interface EditRef {
  kind: "ex" | "slot";
  id: string;
}

/** Build the set-table view model for an exercise prescription or cycled slot. */
export function buildSetBlock(_p: ExercisePrescription | CycledSlot): SetBlockVM {
  const { repMode, intensity, rest, sets, notes } = _p;

  const showIntCol = intensity !== "none";
  const repHeader = repMode === "time" ? "TIME" : "REPS";
  const intHeader = intensity === "rpe" ? "RPE" : intensity === "pct" ? "%1RM" : "";
  const gridCols = showIntCol
    ? "30px minmax(150px,1fr) 86px 26px"
    : "30px minmax(150px,1fr) 26px";

  const mins = Math.floor(rest / 60);
  const secs = rest % 60;
  const restStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  let workingCount = 0;
  const rows: SetRowVM[] = sets.map((set, i) => {
    let badgeLabel: string;
    let badgeKind: "warm" | "work" | "drop";
    let typeName: string;

    if (set.type === "warmup") {
      badgeLabel = "W";
      badgeKind = "warm";
      typeName = "Warm-up";
    } else if (set.type === "drop") {
      badgeLabel = "D";
      badgeKind = "drop";
      typeName = "Drop set";
    } else {
      workingCount += 1;
      badgeLabel = String(workingCount);
      badgeKind = "work";
      typeName = "Working";
    }

    const repA = set.a;
    const repB = set.b != null ? set.b : null;
    const hasB = repMode === "range" && repB != null;

    let repsStr: string;
    if (repMode === "time") {
      repsStr = `${set.a}s`;
    } else if (repMode === "range" && repB != null) {
      repsStr = `${set.a}–${repB}`;
    } else {
      repsStr = `${set.a}`;
    }

    const showInt = showIntCol;
    let intStr = "";
    if (showInt && set.val != null) {
      intStr = intensity === "pct" ? `${set.val}%` : `${set.val}`;
    }

    return {
      index: i,
      badgeLabel,
      badgeKind,
      typeName,
      repA,
      repB,
      repsStr,
      isTime: repMode === "time",
      hasB,
      showInt,
      intStr,
    };
  });

  return {
    rows,
    repMode,
    intensity,
    showIntCol,
    repHeader,
    intHeader,
    gridCols,
    restStr,
    notes: notes ?? "",
  };
}

export interface ExerciseCardVM {
  id: string;
  name: string;
  muscles: string;
  equip: string;
  block: SetBlockVM;
  supersetTag: string | null; // "A1"/"A2" within a superset, else null
}
export interface CycledSlotVM {
  id: string;
  group: MuscleGroup;
  muscle: string;
  poolNames: { id: string; name: string }[];
  poolStr: string;
  block: SetBlockVM;
}
export type EditorRow =
  | { kind: "ex"; ex: ExerciseCardVM }
  | { kind: "superset"; members: ExerciseCardVM[] }
  | { kind: "slot"; slot: CycledSlotVM };

export interface EditorVM {
  exists: boolean;
  dayId: string;
  name: string;
  isFixed: boolean;
  isWeekday: boolean;
  dayOrderLabel: string;
  weekday: number | null;
  summary: string;
  rows: EditorRow[];
}

/** Build the day-editor view model. */
export function buildEditor(_program: Program, _editDayId: string | null, _library: Library): EditorVM {
  const days = _program.days;

  if (days.length === 0) {
    return {
      exists: false,
      dayId: "",
      name: "",
      isFixed: _program.type === "fixed",
      isWeekday: _program.schedule === "weekday",
      dayOrderLabel: "Day 1",
      weekday: null,
      summary: "",
      rows: [],
    };
  }

  // Pick the day: editDayId or first
  let day = _editDayId != null ? days.find((d) => d.id === _editDayId) : undefined;
  if (day == null && _editDayId != null) {
    // editDayId given but not found → exists=false
    return {
      exists: false,
      dayId: "",
      name: "",
      isFixed: _program.type === "fixed",
      isWeekday: _program.schedule === "weekday",
      dayOrderLabel: "Day 1",
      weekday: null,
      summary: "",
      rows: [],
    };
  }
  if (day == null) {
    day = days[0];
  }

  const dayIndex = days.indexOf(day);
  const isFixed = _program.type === "fixed";
  const isWeekday = _program.schedule === "weekday";
  const summary = daySummary(day, _program.type);

  let rows: EditorRow[];

  if (isFixed) {
    // Group consecutive exercises with same supersetId
    const exercises = day.exercises;
    rows = [];
    let i = 0;

    while (i < exercises.length) {
      const ex = exercises[i];
      if (ex.supersetId) {
        // Find all consecutive exercises sharing this supersetId
        const sid = ex.supersetId;
        const members: ExerciseCardVM[] = [];
        let j = i;
        let memberIndex = 0;
        while (j < exercises.length && exercises[j].supersetId === sid) {
          memberIndex += 1;
          const e = exercises[j];
          const libEx = _library.byId(e.exId)!;
          const name = libEx.name;
          const allMuscles = [...libEx.primary, ...libEx.secondary];
          const muscles = allMuscles.map((m) => MUSCLE_NAMES[m]).join(", ");
          const equip = EQUIPMENT_NAMES[libEx.equipment].toUpperCase();
          const block = buildSetBlock(e);
          const tag = `A${memberIndex}`;
          members.push({ id: e.id, name, muscles, equip, block, supersetTag: tag });
          j++;
        }
        rows.push({ kind: "superset", members });
        i = j;
      } else {
        const libEx = _library.byId(ex.exId)!;
        const name = libEx.name;
        const allMuscles = [...libEx.primary, ...libEx.secondary];
        const muscles = allMuscles.map((m) => MUSCLE_NAMES[m]).join(", ");
        const equip = EQUIPMENT_NAMES[libEx.equipment].toUpperCase();
        const block = buildSetBlock(ex);
        const exCard: ExerciseCardVM = { id: ex.id, name, muscles, equip, block, supersetTag: null };
        rows.push({ kind: "ex", ex: exCard });
        i++;
      }
    }
  } else {
    // Cycled: slots
    rows = day.slots.map((slot) => {
      const primaryMuscle = GROUP_PRIMARY_MUSCLE[slot.group];
      const muscle = MUSCLE_NAMES[primaryMuscle];
      const poolNames = slot.pool.map((exId) => {
        const libEx = _library.byId(exId)!;
        return { id: exId, name: libEx.name };
      });
      const poolStr = `${slot.pool.length} exercises`;
      const block = buildSetBlock(slot);
      const slotVM: CycledSlotVM = {
        id: slot.id,
        group: slot.group,
        muscle,
        poolNames,
        poolStr,
        block,
      };
      return { kind: "slot" as const, slot: slotVM };
    });
  }

  return {
    exists: true,
    dayId: day.id,
    name: day.name,
    isFixed,
    isWeekday,
    dayOrderLabel: `Day ${dayIndex + 1}`,
    weekday: day.weekday,
    summary,
    rows,
  };
}

export interface BoardChip {
  name: string;
  superset: boolean;
}
export interface BoardColVM {
  kind: "day" | "rest" | "add";
  label: string;
  weekday?: number;
  dayId?: string;
  name?: string;
  chips?: BoardChip[];
  more?: number;
  editing?: boolean;
}

/** Build the week-board columns. */
export function buildBoard(_program: Program, _profile: GymProfile, _editDayId: string | null): BoardColVM[] {
  const layout = boardLayout(_program, _profile);

  return layout.map((col) => {
    if (col.kind === "add") {
      return { kind: "add" as const, label: col.label };
    }
    if (col.kind === "rest") {
      return { kind: "rest" as const, label: col.label, weekday: col.weekday };
    }
    // day
    const card = col.card!;
    const editing = _editDayId != null && card.dayId === _editDayId;
    const result: BoardColVM = {
      kind: "day" as const,
      label: col.label,
      dayId: card.dayId,
      name: card.name,
      chips: card.chips,
      more: card.more,
    };
    if (col.weekday !== undefined) {
      result.weekday = col.weekday;
    }
    if (editing) {
      result.editing = true;
    }
    return result;
  });
}

// ---------- components ----------

/** All planner mutation callbacks (wired to the store). */
export interface PlannerCallbacks {
  onSetType: (t: "fixed" | "cycled") => void;
  onSetSchedule: (s: "weekday" | "floating") => void;
  onToggleProfileMenu: () => void;
  onSetProfile: (id: string) => void;
  onSelectDay: (dayId: string) => void;
  onRenameDay: (dayId: string, name: string) => void;
  onSetWeekday: (dayId: string, weekday: number) => void;
  onAddDay: (weekday: number | null) => void;
  onRemoveDay: (dayId: string) => void;
  onAddExercise: (dayId: string) => void; // opens library
  onRemoveExercise: (dayId: string, rowId: string) => void;
  onToggleSuperset: (dayId: string, rowId: string) => void;
  onAddSlot: (dayId: string, group: MuscleGroup) => void;
  onRemoveSlot: (dayId: string, slotId: string) => void;
  onAddPool: (dayId: string, slotId: string) => void; // opens library
  onRemoveFromPool: (dayId: string, slotId: string, exId: string) => void;
  onEdit: (dayId: string, ref: EditRef, op: string, ...args: number[]) => void;
  onNotes: (dayId: string, ref: EditRef, notes: string) => void;
}

export interface SetTableProps {
  dayId: string;
  refTarget: EditRef;
  block: SetBlockVM;
  cb: PlannerCallbacks;
}

export function SetTable(_p: SetTableProps): JSX.Element {
  const { dayId, refTarget, block, cb } = _p;
  const { rows, repMode, intensity, restStr, notes } = block;

  const repModeOptions = [
    { k: "range", label: "Range" },
    { k: "fixed", label: "Fixed" },
    { k: "time", label: "Time" },
  ];

  const intensityOptions = [
    { k: "none", label: "None" },
    { k: "rpe", label: "RPE" },
    { k: "pct", label: "%1RM" },
  ];

  const repModeIdx: Record<string, number> = { range: 0, fixed: 1, time: 2 };
  const intensityIdx: Record<string, number> = { none: 0, rpe: 1, pct: 2 };

  const setRows = rows.map((row) =>
    React.createElement(
      "div",
      { key: row.index, style: { display: "flex", alignItems: "center", gap: 4 } },
      // Badge button
      React.createElement(
        "button",
        { onClick: () => cb.onEdit(dayId, refTarget, "cycleSetType", row.index) },
        row.badgeLabel,
      ),
      // Rep display
      React.createElement("span", null, row.repsStr),
      // a-stepper
      React.createElement(MiniStepper, {
        value: row.repA,
        onDec: () => cb.onEdit(dayId, refTarget, "stepRep", row.index, 1, -1),
        onInc: () => cb.onEdit(dayId, refTarget, "stepRep", row.index, 1, 1),
      }),
      // b-stepper (only when hasB)
      row.hasB
        ? React.createElement(MiniStepper, {
            value: row.repB!,
            onDec: () => cb.onEdit(dayId, refTarget, "stepRep", row.index, 0, -1),
            onInc: () => cb.onEdit(dayId, refTarget, "stepRep", row.index, 0, 1),
          })
        : null,
      // intensity stepper (only when showInt and intStr is set)
      row.showInt && row.intStr !== ""
        ? React.createElement(MiniStepper, {
            value: row.intStr,
            onDec: () => cb.onEdit(dayId, refTarget, "stepVal", row.index, -1),
            onInc: () => cb.onEdit(dayId, refTarget, "stepVal", row.index, 1),
          })
        : null,
      // Remove button
      React.createElement(
        "button",
        {
          onClick: () => cb.onEdit(dayId, refTarget, "removeSet", row.index),
          "aria-label": "remove",
        },
        "×",
      ),
    ),
  );

  return React.createElement(
    "div",
    null,
    // Rows
    ...setRows,
    // Rep mode segmented
    React.createElement(Segmented, {
      options: repModeOptions,
      value: repMode,
      onChange: (k) => cb.onEdit(dayId, refTarget, "setRepMode", repModeIdx[k]),
    }),
    // Intensity segmented
    React.createElement(Segmented, {
      options: intensityOptions,
      value: intensity,
      onChange: (k) => cb.onEdit(dayId, refTarget, "setIntensity", intensityIdx[k]),
    }),
    // Rest stepper
    React.createElement(
      "div",
      null,
      React.createElement("span", null, "Rest: ", restStr),
      React.createElement(MiniStepper, {
        value: restStr,
        onDec: () => cb.onEdit(dayId, refTarget, "setRest", -1),
        onInc: () => cb.onEdit(dayId, refTarget, "setRest", 1),
      }),
    ),
    // Add set / Add warmup
    React.createElement(
      "button",
      { onClick: () => cb.onEdit(dayId, refTarget, "addSet") },
      "+ Add set",
    ),
    React.createElement(
      "button",
      { onClick: () => cb.onEdit(dayId, refTarget, "addWarmup") },
      "+ Warmup",
    ),
    // Notes input
    React.createElement("input", {
      value: notes,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        cb.onNotes(dayId, refTarget, e.target.value),
    }),
  );
}

export interface ProgramHeaderProps {
  name: string;
  type: "fixed" | "cycled";
  schedule: "weekday" | "floating";
  profileName: string;
  profiles: GymProfile[];
  activeProfileId: string;
  profileMenuOpen: boolean;
  cb: PlannerCallbacks;
}

export function ProgramHeader(_p: ProgramHeaderProps): JSX.Element {
  const { name, type, schedule, profileName, profiles, profileMenuOpen, cb } = _p;

  const typeOptions = [
    { k: "fixed", label: "Fixed" },
    { k: "cycled", label: "Cycled" },
  ];
  const scheduleOptions = [
    { k: "weekday", label: "Weekday" },
    { k: "floating", label: "Floating" },
  ];

  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, name),
    React.createElement(Segmented, {
      options: typeOptions,
      value: type,
      onChange: (k) => cb.onSetType(k as "fixed" | "cycled"),
    }),
    React.createElement(Segmented, {
      options: scheduleOptions,
      value: schedule,
      onChange: (k) => cb.onSetSchedule(k as "weekday" | "floating"),
    }),
    React.createElement(
      Button,
      { onClick: cb.onToggleProfileMenu, variant: "ghost" },
      profileName,
    ),
    profileMenuOpen
      ? React.createElement(
          "div",
          { role: "menu" },
          ...profiles.map((p) =>
            React.createElement(
              Button,
              { key: p.id, onClick: () => cb.onSetProfile(p.id), variant: "ghost" },
              p.name,
            ),
          ),
        )
      : null,
  );
}

export interface WeekBoardProps {
  columns: BoardColVM[];
  cb: PlannerCallbacks;
}

export function WeekBoard(_p: WeekBoardProps): JSX.Element {
  const { columns, cb } = _p;

  const cols = columns.map((col, i) => {
    if (col.kind === "add") {
      return React.createElement(
        "div",
        { key: i },
        React.createElement(
          "div",
          { onClick: () => cb.onAddDay(null), style: { cursor: "pointer" } },
          col.label,
        ),
      );
    }
    if (col.kind === "rest") {
      return React.createElement(
        "div",
        { key: i },
        React.createElement("div", null, col.label),
        React.createElement(
          "button",
          { onClick: () => cb.onAddDay(col.weekday!) },
          "+ Add day",
        ),
      );
    }
    // day
    return React.createElement(
      "div",
      { key: i, "data-editing": col.editing ? "true" : undefined },
      React.createElement("div", null, col.label),
      React.createElement(
        "div",
        { onClick: () => cb.onSelectDay(col.dayId!), style: { cursor: "pointer" } },
        col.name,
      ),
    );
  });

  return React.createElement("div", { style: { display: "flex" } }, ...cols);
}

export interface DayEditorProps {
  editor: EditorVM;
  groups: MuscleGroup[];
  cb: PlannerCallbacks;
}

export function DayEditor(_p: DayEditorProps): JSX.Element {
  const { editor, groups, cb } = _p;

  if (!editor.exists) {
    return React.createElement("div", null);
  }

  const { dayId, name, isFixed, summary, rows } = editor;

  const renderExCard = (ex: ExerciseCardVM): JSX.Element =>
    React.createElement(
      "div",
      { key: ex.id },
      ex.supersetTag ? React.createElement("span", null, ex.supersetTag) : null,
      React.createElement("div", null, ex.name),
      React.createElement("div", { title: ex.muscles }, ex.equip),
      React.createElement(
        "button",
        {
          "aria-label": "remove exercise",
          onClick: () => cb.onRemoveExercise(dayId, ex.id),
        },
        "Remove",
      ),
      React.createElement(
        "button",
        {
          "aria-label": "toggle superset",
          onClick: () => cb.onToggleSuperset(dayId, ex.id),
        },
        "⛓",
      ),
      React.createElement(SetTable, {
        dayId,
        refTarget: { kind: "ex", id: ex.id },
        block: ex.block,
        cb,
      }),
    );

  const renderedRows = rows.map((row, i) => {
    if (row.kind === "ex") {
      return React.createElement("div", { key: i }, renderExCard(row.ex));
    }
    if (row.kind === "superset") {
      return React.createElement(
        "div",
        { key: i },
        ...row.members.map((m) => renderExCard(m)),
      );
    }
    // slot
    const slot = row.slot;
    return React.createElement(
      "div",
      { key: i },
      React.createElement("div", null, slot.poolStr),
      ...slot.poolNames.map((pn) =>
        React.createElement(
          "span",
          { key: pn.id },
          pn.name,
          React.createElement(
            "button",
            {
              "aria-label": "remove from pool",
              onClick: () => cb.onRemoveFromPool(dayId, slot.id, pn.id),
            },
            "×",
          ),
        ),
      ),
      React.createElement(
        "button",
        { onClick: () => cb.onAddPool(dayId, slot.id) },
        "+ Add exercise",
      ),
      React.createElement(
        "button",
        {
          "aria-label": "remove slot",
          onClick: () => cb.onRemoveSlot(dayId, slot.id),
        },
        "Remove slot",
      ),
      React.createElement(SetTable, {
        dayId,
        refTarget: { kind: "slot", id: slot.id },
        block: slot.block,
        cb,
      }),
    );
  });

  const fixedControls = isFixed
    ? React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          { onClick: () => cb.onAddExercise(dayId) },
          "+ Add exercise",
        ),
      )
    : React.createElement(
        "div",
        null,
        ...groups.map((g) =>
          React.createElement(
            "button",
            { key: g, onClick: () => cb.onAddSlot(dayId, g) },
            g,
          ),
        ),
      );

  return React.createElement(
    "div",
    null,
    React.createElement("input", {
      value: name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        cb.onRenameDay(dayId, e.target.value),
    }),
    React.createElement("div", null, summary),
    React.createElement(
      "button",
      { onClick: () => cb.onRemoveDay(dayId) },
      "Delete day",
    ),
    ...renderedRows,
    fixedControls,
  );
}

export interface PlannerScreenProps {
  program: Program;
  library: Library;
  profile: GymProfile;
  profiles: GymProfile[];
  activeProfileId: string;
  profileMenuOpen: boolean;
  editDayId: string | null;
  /** per-muscle planned volume bars for the coverage rail. */
  volumeBars: { muscle: string; name: string; sets: number; pct: number }[];
  coverage: import("@nabd/domain").Coverage;
  cb: PlannerCallbacks;
}

export function PlannerScreen(_p: PlannerScreenProps): JSX.Element {
  const {
    program,
    library,
    profile,
    profiles,
    activeProfileId,
    profileMenuOpen,
    editDayId,
    volumeBars,
    coverage,
    cb,
  } = _p;

  const columns = buildBoard(program, profile, editDayId);
  const editor = buildEditor(program, editDayId, library);

  return React.createElement(
    "div",
    null,
    React.createElement(ProgramHeader, {
      name: program.name,
      type: program.type,
      schedule: program.schedule,
      profileName: profile.name,
      profiles,
      activeProfileId,
      profileMenuOpen,
      cb,
    }),
    React.createElement(WeekBoard, { columns, cb }),
    editor.exists
      ? React.createElement(DayEditor, {
          editor,
          groups: [] as MuscleGroup[],
          cb,
        })
      : null,
    // Coverage rail
    React.createElement(
      "div",
      null,
      React.createElement(BodyMap, { side: "front", coverage }),
      React.createElement(BodyMap, { side: "back", coverage }),
      ...volumeBars.map((bar) =>
        React.createElement(
          "div",
          { key: bar.muscle },
          React.createElement("span", null, bar.name),
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: { width: `${bar.pct}%` } }),
          ),
        ),
      ),
    ),
  );
}
