// @nabd/planner — the Plan screen: program header, week board, day editor
// (set tables, supersets, cycled slots) and the live coverage rail.

import React from "react";
import type {
  Coverage,
  Intensity,
  MuscleKey,
  Program,
  ProgramType,
  RepMode,
  Schedule,
} from "@nabd/domain";
import { MUSCLE_NAMES, plural } from "@nabd/domain";
import type { ExerciseLibrary } from "@nabd/dataset";
import type { EditRef, ProgramEdit } from "@nabd/program-editor";
import { BodyMap } from "@nabd/bodymap";
import { Segmented } from "@nabd/design-system";
import { buildBoard, buildEditor } from "./view-model";
import type { BoardColVM, EditorVM, ExerciseCardVM, SetBlockVM } from "./view-model";

export { buildBoard, buildEditor, buildSetBlock } from "./view-model";
export type {
  BoardChip,
  BoardColVM,
  CycledSlotVM,
  EditorRow,
  EditorVM,
  ExerciseCardVM,
  SetBlockVM,
  SetRowVM,
} from "./view-model";

/**
 * Anatomically-ordered MuscleKey list for the cycled-slot target picker.
 * Order: shoulders → back → chest/core → arms → legs → neck
 */
const MUSCLES_ANATOMICAL: MuscleKey[] = [
  "front_delts",
  "side_delts",
  "rear_delts",
  "upper_traps",
  "rhomboids",
  "lower_traps",
  "lats",
  "lower_back",
  "chest",
  "abs",
  "obliques",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "calves",
  "tibialis",
  "hip_flexors",
  "neck",
];

// ---------- components ----------

/** What the planner asks of the app. Every program change goes through `onEdit`. */
export interface PlannerCallbacks {
  onEdit: (edit: ProgramEdit) => void;
  onSelectDay: (dayId: string) => void;
  /** Open the library to add an exercise to a fixed day. */
  onAddExercise: (dayId: string) => void;
  /** Open the library to add an exercise to a cycled slot's pool. */
  onAddPool: (dayId: string, slotId: string) => void;
}

/** A pair of arrows that move something one place earlier (-1) or later (+1). */
function MoveButtons(p: {
  onMove: (direction: number) => void;
  horizontal?: boolean;
}): JSX.Element {
  const [earlier, later] = p.horizontal ? ["◀", "▶"] : ["▲", "▼"];
  const arrow = (label: string, glyph: string, direction: number) =>
    React.createElement(
      "button",
      {
        "aria-label": label,
        title: label,
        onClick: () => p.onMove(direction),
        style: { ...miniBtn, fontSize: 9 },
      },
      glyph,
    );
  return React.createElement(
    "div",
    { style: { display: "inline-flex", gap: 3, flex: "none" } },
    arrow("Move earlier", earlier, -1),
    arrow("Move later", later, 1),
  );
}

export interface SetTableProps {
  dayId: string;
  refTarget: EditRef;
  block: SetBlockVM;
  cb: PlannerCallbacks;
}

// Shared mini button style for steppers (matching design's --mini style)
const miniBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  background: "var(--surface2)",
  border: "1px solid var(--line)",
  color: "var(--text2)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
  flex: "none",
};

export function SetTable(_p: SetTableProps): JSX.Element {
  const { dayId, refTarget, block, cb } = _p;
  const { rows, repMode, intensity, showIntCol, repHeader, intHeader, gridCols, restStr, notes } =
    block;

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

  // Table header row
  const headerRow = React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: gridCols,
        gap: 9,
        alignItems: "center",
        padding: "0 2px 7px",
        borderBottom: "1px solid var(--line)",
      },
    },
    React.createElement(
      "span",
      {
        style: {
          fontSize: 9,
          fontFamily: "'JetBrains Mono',monospace",
          color: "var(--text3)",
          letterSpacing: ".07em",
        },
      },
      "SET",
    ),
    React.createElement(
      "span",
      {
        style: {
          fontSize: 9,
          fontFamily: "'JetBrains Mono',monospace",
          color: "var(--text3)",
          letterSpacing: ".07em",
        },
      },
      repHeader,
    ),
    showIntCol
      ? React.createElement(
          "span",
          {
            style: {
              fontSize: 9,
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--text3)",
              letterSpacing: ".07em",
            },
          },
          intHeader,
        )
      : null,
    React.createElement("span", null),
  );

  // Set rows — rendered BEFORE controls so +/− buttons have expected DOM order
  const setRows = rows.map((row) => {
    // Badge style per kind
    let badgeStyle: React.CSSProperties;
    if (row.badgeKind === "warm") {
      badgeStyle = {
        width: 26,
        height: 26,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        flex: "none",
        border: "none",
        background: "var(--surface2)",
        color: "var(--text3)",
      };
    } else if (row.badgeKind === "drop") {
      badgeStyle = {
        width: 26,
        height: 26,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        flex: "none",
        border: "none",
        background: "color-mix(in oklch,var(--accent3) 16%,transparent)",
        color: "var(--accent3)",
      };
    } else {
      badgeStyle = {
        width: 26,
        height: 26,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        flex: "none",
        border: "none",
        background: "color-mix(in oklch,var(--accent) 16%,transparent)",
        color: "var(--accent)",
      };
    }

    // Intensity stepper — only when showInt AND intStr is non-empty (has a value)
    const intStepper =
      row.showInt && row.intStr !== ""
        ? React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 4 } },
            React.createElement(
              "button",
              {
                style: miniBtn,
                onClick: () => cb.onEdit((e) => e.stepVal(dayId, refTarget, row.index, -1)),
              },
              "−",
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "12.5px",
                  color: "var(--text2)",
                  minWidth: 30,
                  textAlign: "center" as const,
                },
              },
              row.intStr,
            ),
            React.createElement(
              "button",
              {
                style: miniBtn,
                onClick: () => cb.onEdit((e) => e.stepVal(dayId, refTarget, row.index, 1)),
              },
              "+",
            ),
          )
        : showIntCol
          ? React.createElement("div", null)
          : null;

    return React.createElement(
      "div",
      {
        key: row.index,
        style: { display: "grid", gridTemplateColumns: gridCols, gap: 9, alignItems: "center" },
      },
      // Badge button
      React.createElement(
        "button",
        {
          style: badgeStyle,
          title: `${row.typeName} — click to change`,
          onClick: () => cb.onEdit((e) => e.cycleSetType(dayId, refTarget, row.index)),
        },
        row.badgeLabel,
      ),
      // Rep cell: a-dec, a-val, a-inc, [sep, b-dec, b-val, b-inc] | [Xs for time]
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 4 } },
        // a stepper dec
        React.createElement(
          "button",
          {
            style: miniBtn,
            onClick: () => cb.onEdit((e) => e.stepRep(dayId, refTarget, row.index, "a", -1)),
          },
          "−",
        ),
        React.createElement(
          "span",
          {
            style: {
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: 600,
              minWidth: 24,
              textAlign: "center" as const,
            },
          },
          row.repA,
        ),
        // a stepper inc
        React.createElement(
          "button",
          {
            style: miniBtn,
            onClick: () => cb.onEdit((e) => e.stepRep(dayId, refTarget, row.index, "a", 1)),
          },
          "+",
        ),
        // b stepper (range mode)
        row.hasB
          ? React.createElement("span", { style: { color: "var(--text3)", fontSize: 12 } }, "–")
          : null,
        row.hasB
          ? React.createElement(
              "button",
              {
                style: miniBtn,
                onClick: () => cb.onEdit((e) => e.stepRep(dayId, refTarget, row.index, "b", -1)),
              },
              "−",
            )
          : null,
        row.hasB
          ? React.createElement(
              "span",
              {
                style: {
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  minWidth: 24,
                  textAlign: "center" as const,
                },
              },
              row.repB,
            )
          : null,
        row.hasB
          ? React.createElement(
              "button",
              {
                style: miniBtn,
                onClick: () => cb.onEdit((e) => e.stepRep(dayId, refTarget, row.index, "b", 1)),
              },
              "+",
            )
          : null,
        // time: render repsStr as combined "Xs" text
        row.isTime
          ? React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: "var(--text3)",
                  fontFamily: "'JetBrains Mono',monospace",
                  marginLeft: 2,
                },
              },
              `${row.repA}s`,
            )
          : null,
      ),
      // Intensity cell
      intStepper,
      // Remove button
      React.createElement(
        "button",
        {
          style: {
            background: "none",
            border: "none",
            color: "var(--text3)",
            cursor: "pointer",
            fontSize: 14,
            justifySelf: "end" as const,
          },
          onClick: () => cb.onEdit((e) => e.removeSet(dayId, refTarget, row.index)),
          "aria-label": "remove",
        },
        "×",
      ),
    );
  });

  // Controls row: REPS mode seg + LOAD seg + REST stepper — rendered AFTER set rows
  const controlsRow = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginTop: 11,
        flexWrap: "wrap" as const,
      },
    },
    // REPS mode
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 6 } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: "9.5px",
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
          },
        },
        "REPS",
      ),
      React.createElement(Segmented, {
        options: repModeOptions,
        value: repMode,
        onChange: (k) => cb.onEdit((e) => e.setRepMode(dayId, refTarget, k as RepMode)),
        size: "sm",
      }),
    ),
    // LOAD intensity
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 6 } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: "9.5px",
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
          },
        },
        "LOAD",
      ),
      React.createElement(Segmented, {
        options: intensityOptions,
        value: intensity,
        onChange: (k) => cb.onEdit((e) => e.setIntensity(dayId, refTarget, k as Intensity)),
        size: "sm",
      }),
    ),
    // REST stepper — last so lastPlus/lastMinus point here
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 7, marginLeft: "auto" } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: "9.5px",
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
          },
        },
        "REST",
      ),
      React.createElement(
        "button",
        { style: miniBtn, onClick: () => cb.onEdit((e) => e.stepRest(dayId, refTarget, -1)) },
        "−",
      ),
      React.createElement(
        "span",
        {
          style: {
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "12.5px",
            width: 36,
            textAlign: "center" as const,
          },
        },
        restStr,
      ),
      React.createElement(
        "button",
        { style: miniBtn, onClick: () => cb.onEdit((e) => e.stepRest(dayId, refTarget, 1)) },
        "+",
      ),
    ),
  );

  // Add set / Warmup / Notes — after controls
  const footer = React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { style: { display: "flex", gap: 16, paddingTop: 9 } },
      React.createElement(
        "button",
        {
          style: {
            background: "none",
            border: "none",
            color: "var(--accent)",
            fontSize: "12.5px",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: 0,
          },
          onClick: () => cb.onEdit((e) => e.addSet(dayId, refTarget)),
        },
        "+ Add set",
      ),
      React.createElement(
        "button",
        {
          style: {
            background: "none",
            border: "none",
            color: "var(--text3)",
            fontSize: "12.5px",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: 0,
          },
          onClick: () => cb.onEdit((e) => e.addWarmup(dayId, refTarget)),
        },
        "+ Warmup",
      ),
    ),
    React.createElement("input", {
      value: notes,
      placeholder: "✎ Add a note (cues, setup, tempo…)",
      style: {
        marginTop: 10,
        width: "100%",
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 9,
        padding: "9px 11px",
        fontSize: "12.5px",
        fontFamily: "inherit",
        color: "var(--text)",
        outline: "none",
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        cb.onEdit((editor) => editor.setNotes(dayId, refTarget, e.target.value)),
    }),
  );

  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { style: { marginTop: 13 } },
      headerRow,
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 } },
        ...setRows,
      ),
    ),
    controlsRow,
    footer,
  );
}

export interface ProgramHeaderProps {
  name: string;
  type: "fixed" | "cycled";
  schedule: "weekday" | "floating";
  cb: PlannerCallbacks;
}

export function ProgramHeader(_p: ProgramHeaderProps): JSX.Element {
  const { name, type, schedule, cb } = _p;

  const typeOptions = [
    { k: "fixed", label: "Fixed" },
    { k: "cycled", label: "Cycled" },
  ];
  const scheduleOptions = [
    { k: "weekday", label: "Weekdays" },
    { k: "floating", label: "Floating" },
  ];

  return React.createElement(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const } },
    // Program label + name
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        {
          style: {
            fontSize: 11,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: ".06em",
          },
        },
        "PROGRAM",
      ),
      React.createElement("input", {
        value: name,
        "aria-label": "Program name",
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          cb.onEdit((editor) => editor.rename(e.target.value)),
        style: {
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-.02em",
          fontFamily: "inherit",
          color: "var(--text)",
          background: "transparent",
          border: "none",
          outline: "none",
          padding: 0,
          width: 280,
        },
      }),
    ),
    // Fixed|Cycled segmented
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 3,
          gap: 2,
        },
      },
      React.createElement(Segmented, {
        options: typeOptions,
        value: type,
        onChange: (k) => cb.onEdit((e) => e.setType(k as ProgramType)),
      }),
    ),
    // Weekdays|Floating segmented
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 3,
          gap: 2,
        },
      },
      React.createElement(Segmented, {
        options: scheduleOptions,
        value: schedule,
        onChange: (k) => cb.onEdit((e) => e.setSchedule(k as Schedule)),
      }),
    ),
  );
}

export interface WeekBoardProps {
  columns: BoardColVM[];
  cb: PlannerCallbacks;
}

export function WeekBoard(_p: WeekBoardProps): JSX.Element {
  const { columns, cb } = _p;

  // Determine if this is a weekday board (7 cols) or floating
  const isWeekday = columns.some((c) => c.label === "MON");
  const gridStyle: React.CSSProperties = isWeekday
    ? { display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 10 }
    : { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 };

  const cols = columns.map((col, i) => {
    if (col.kind === "add") {
      return React.createElement(
        "button",
        {
          key: i,
          style: {
            border: "1px dashed var(--line)",
            borderRadius: 13,
            background: "none",
            minHeight: 150,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--text3)",
            cursor: "pointer",
            fontFamily: "inherit",
          },
          onClick: () => cb.onEdit((e) => e.addDay(null)),
        },
        React.createElement("span", { style: { fontSize: 24 } }, "+"),
        React.createElement("span", { style: { fontSize: 12, fontWeight: 600 } }, col.label),
      );
    }
    if (col.kind === "rest") {
      return React.createElement(
        "div",
        {
          key: i,
          style: {
            border: "1px solid var(--line)",
            borderRadius: 13,
            background: "var(--surface)",
            padding: 11,
            minHeight: 150,
            display: "flex",
            flexDirection: "column",
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: "10.5px",
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--text3)",
            },
          },
          col.label,
        ),
        React.createElement(
          "span",
          { style: { fontSize: 13, fontWeight: 600, color: "var(--text3)", marginTop: 5 } },
          "Rest",
        ),
        React.createElement(
          "button",
          {
            style: {
              marginTop: "auto",
              background: "none",
              border: "1px dashed var(--line)",
              borderRadius: 9,
              color: "var(--text3)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              padding: 8,
            },
            onClick: () => cb.onEdit((e) => e.addDay(col.weekday!)),
          },
          "+ Add day",
        ),
      );
    }
    // day card
    const chipEls = (col.chips ?? []).map((ch, ci) =>
      React.createElement(
        "span",
        {
          key: ci,
          style: {
            fontSize: "11px",
            fontWeight: 500,
            padding: "4px 8px",
            borderRadius: 7,
            background: ch.superset
              ? "color-mix(in oklch,var(--accent2) 14%,transparent)"
              : "var(--surface2)",
            border: ch.superset
              ? "1px solid color-mix(in oklch,var(--accent2) 30%,transparent)"
              : "1px solid var(--line)",
            color: ch.superset ? "var(--accent2)" : "var(--text2)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap" as const,
            display: "block",
          },
        },
        ch.name,
      ),
    );

    return React.createElement(
      "div",
      {
        key: i,
        "data-editing": col.editing ? "true" : undefined,
        style: {
          border: col.editing ? "1.5px solid var(--accent)" : "1px solid var(--line)",
          borderRadius: 13,
          background: "var(--surface)",
          padding: 11,
          minHeight: 150,
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          boxShadow: col.editing
            ? "0 0 0 3px color-mix(in oklch,var(--accent) 18%,transparent)"
            : undefined,
        },
        onClick: () => cb.onSelectDay(col.dayId!),
      },
      // Header row: label + editing dot
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
        React.createElement(
          "span",
          {
            style: {
              fontSize: "10.5px",
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--text3)",
            },
          },
          col.label,
        ),
        col.editing
          ? React.createElement("span", {
              style: {
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "inline-block",
              },
            })
          : null,
      ),
      // Day name
      React.createElement(
        "div",
        {
          style: { fontSize: "14.5px", fontWeight: 800, margin: "5px 0 8px" },
        },
        col.name,
      ),
      // Exercise chips
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 } },
        ...chipEls,
        col.more && col.more > 0
          ? React.createElement(
              "span",
              { style: { fontSize: 10, color: "var(--text3)", padding: "2px 2px" } },
              `+${col.more} more`,
            )
          : null,
      ),
    );
  });

  return React.createElement("div", { style: gridStyle }, ...cols);
}

export interface DayEditorProps {
  editor: EditorVM;
  muscles: MuscleKey[];
  cb: PlannerCallbacks;
}

// Weekday labels for the picker
const WD_LABELS_LONG = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function DayEditor(_p: DayEditorProps): JSX.Element {
  const { editor, muscles, cb } = _p;

  const { dayId, name, isFixed, isWeekday, weekday, dayOrderLabel, summary, rows } = editor;

  // Weekday picker: 7 buttons (MON=1..SUN=0)
  const weekdayPicker = isWeekday
    ? React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 4 } },
        ...[1, 2, 3, 4, 5, 6, 0].map((wd, idx) => {
          const label = ["M", "T", "W", "T", "F", "S", "S"][idx];
          const longLabel = WD_LABELS_LONG[wd];
          const active = weekday === wd;
          return React.createElement(
            "button",
            {
              key: wd,
              title: longLabel,
              style: {
                width: 28,
                height: 28,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono',monospace",
                background: active ? "var(--accent)" : "var(--surface2)",
                color: active ? "#fff" : "var(--text3)",
                border: active ? "none" : "1px solid var(--line)",
                cursor: "pointer",
                padding: 0,
              },
              onClick: () => cb.onEdit((e) => e.setWeekday(dayId, wd)),
            },
            label,
          );
        }),
      )
    : React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 6 } },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--text3)",
              border: "1px solid var(--line)",
              borderRadius: 7,
              padding: "6px 10px",
              letterSpacing: ".04em",
            },
          },
          `${dayOrderLabel} · floating`,
        ),
        React.createElement(MoveButtons, {
          horizontal: true,
          onMove: (direction) => cb.onEdit((e) => e.moveDay(dayId, direction)),
        }),
      );

  const renderExCard = (ex: ExerciseCardVM, inSuperset = false): JSX.Element =>
    React.createElement(
      "div",
      {
        key: ex.id,
        style: {
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: inSuperset ? 12 : 13,
          padding: inSuperset ? 13 : 14,
        },
      },
      // Exercise header
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "flex-start", gap: 10 } },
        ex.supersetTag
          ? React.createElement(
              "span",
              {
                style: {
                  color: "var(--accent2)",
                  fontFamily: "'JetBrains Mono',monospace",
                  fontWeight: 700,
                  fontSize: 12,
                  marginTop: 2,
                },
              },
              ex.supersetTag,
            )
          : null,
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement("div", { style: { fontSize: 15, fontWeight: 700 } }, ex.name),
          React.createElement(
            "div",
            { style: { fontSize: 11, color: "var(--text3)", marginTop: 3 } },
            ex.muscles,
          ),
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: "9.5px",
              fontFamily: "'JetBrains Mono',monospace",
              color: "var(--text3)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "4px 7px",
              flex: "none",
            },
          },
          ex.equip,
        ),
        React.createElement(MoveButtons, {
          onMove: (direction) => cb.onEdit((e) => e.moveExercise(dayId, ex.id, direction)),
        }),
        React.createElement(
          "button",
          {
            style: {
              background: "none",
              border: "none",
              color: "var(--text3)",
              cursor: "pointer",
              fontSize: 17,
              flex: "none",
              lineHeight: 1,
            },
            "aria-label": "remove exercise",
            onClick: () => cb.onEdit((e) => e.removeExercise(dayId, ex.id)),
          },
          "×",
        ),
      ),
      // Set table
      React.createElement(SetTable, {
        dayId,
        refTarget: { kind: "ex", id: ex.id },
        block: ex.block,
        cb,
      }),
      // Superset toggle (only for non-superset members and in fixed mode)
      !inSuperset
        ? React.createElement(
            "div",
            { style: { paddingTop: 0 } },
            React.createElement(
              "button",
              {
                style: {
                  background: "none",
                  border: "none",
                  color: "var(--accent2)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  padding: 0,
                },
                "aria-label": "toggle superset",
                onClick: () => cb.onEdit((e) => e.toggleSuperset(dayId, ex.id)),
              },
              "⛓ Superset ↓",
            ),
          )
        : React.createElement(
            "div",
            { style: { marginTop: 4 } },
            React.createElement(
              "button",
              {
                style: {
                  background: "none",
                  border: "none",
                  color: "var(--text3)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                },
                "aria-label": "toggle superset",
                onClick: () => cb.onEdit((e) => e.toggleSuperset(dayId, ex.id)),
              },
              "Unlink",
            ),
          ),
    );

  const renderedRows = rows.map((row, i) => {
    if (row.kind === "ex") {
      return React.createElement("div", { key: i }, renderExCard(row.ex, false));
    }
    if (row.kind === "superset") {
      return React.createElement(
        "div",
        {
          key: i,
          style: {
            border: "2px solid var(--accent2)",
            borderRadius: 14,
            padding: 11,
            background: "color-mix(in oklch,var(--accent2) 6%,transparent)",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".12em",
              color: "var(--accent2)",
              fontFamily: "'JetBrains Mono',monospace",
              margin: "0 0 9px 4px",
            },
          },
          "SUPERSET",
        ),
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 9 } },
          ...row.members.map((m) => renderExCard(m, true)),
        ),
      );
    }
    // slot
    const slot = row.slot;
    return React.createElement(
      "div",
      {
        key: i,
        style: {
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 13,
          padding: 15,
        },
      },
      // Slot header
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 12 } },
        React.createElement(
          "div",
          { style: { flex: 1 } },
          React.createElement(
            "div",
            { style: { fontSize: 15, fontWeight: 700 } },
            MUSCLE_NAMES[slot.muscle],
          ),
          React.createElement(
            "div",
            { style: { fontSize: 11, color: "var(--text3)", marginTop: 2 } },
            `Targets ${slot.muscleName} · cycles its pool`,
          ),
        ),
        React.createElement(MoveButtons, {
          onMove: (direction) => cb.onEdit((e) => e.moveSlot(dayId, slot.id, direction)),
        }),
        React.createElement(
          "button",
          {
            style: {
              background: "none",
              border: "none",
              color: "var(--text3)",
              cursor: "pointer",
              fontSize: 17,
              lineHeight: 1,
            },
            "aria-label": "remove slot",
            onClick: () => cb.onEdit((e) => e.removeSlot(dayId, slot.id)),
          },
          "×",
        ),
      ),
      // Exercise pool
      React.createElement(
        "div",
        { style: { marginTop: 12 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 10,
              color: "var(--text3)",
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: ".06em",
              marginBottom: 7,
            },
          },
          `EXERCISE POOL · ${slot.poolStr}`,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 7, flexWrap: "wrap" as const, alignItems: "center" } },
          ...slot.poolNames.map((pn) =>
            React.createElement(
              "span",
              {
                key: pn.id,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  background: "var(--surface2)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "6px 10px",
                },
              },
              pn.name,
              React.createElement(
                "button",
                {
                  style: {
                    background: "none",
                    border: "none",
                    color: "var(--text3)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                  },
                  "aria-label": "remove from pool",
                  onClick: () => cb.onEdit((e) => e.removeFromPool(dayId, slot.id, pn.id)),
                },
                "×",
              ),
            ),
          ),
          React.createElement(
            "button",
            {
              style: {
                fontSize: 12,
                border: "1px dashed var(--line)",
                borderRadius: 8,
                padding: "6px 11px",
                color: "var(--accent)",
                background: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
              },
              onClick: () => cb.onAddPool(dayId, slot.id),
            },
            "+ Add exercise",
          ),
        ),
      ),
      // Prescription
      React.createElement(
        "div",
        { style: { borderTop: "1px solid var(--line)", marginTop: 13, paddingTop: 13 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 10,
              color: "var(--text3)",
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: ".06em",
              marginBottom: 9,
            },
          },
          "PRESCRIPTION · applies to whichever exercise rotates in",
        ),
        React.createElement(SetTable, {
          dayId,
          refTarget: { kind: "slot", id: slot.id },
          block: slot.block,
          cb,
        }),
      ),
    );
  });

  // Fixed: "+ Add exercise" | Cycled: group chips
  const addControls = isFixed
    ? React.createElement(
        "button",
        {
          style: {
            padding: 13,
            border: "1.5px dashed var(--accent)",
            borderRadius: 12,
            color: "var(--accent)",
            fontSize: "13.5px",
            fontWeight: 700,
            background: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          },
          onClick: () => cb.onAddExercise(dayId),
        },
        "+ Add exercise",
      )
    : React.createElement(
        "div",
        { style: { border: "1px dashed var(--line)", borderRadius: 12, padding: 13 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11,
              color: "var(--text3)",
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: ".06em",
              marginBottom: 9,
            },
          },
          "+ ADD MUSCLE",
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 7, flexWrap: "wrap" as const } },
          ...muscles.map((m) =>
            React.createElement(
              "button",
              {
                key: m,
                style: {
                  fontSize: 12,
                  background: "var(--surface2)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "7px 12px",
                  color: "var(--text2)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                },
                onClick: () => cb.onEdit((e) => e.addSlot(dayId, m)),
              },
              MUSCLE_NAMES[m],
            ),
          ),
        ),
      );

  return React.createElement(
    "div",
    {
      style: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        overflow: "hidden",
      },
    },
    // Editor header
    React.createElement(
      "div",
      {
        style: {
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap" as const,
        },
      },
      React.createElement("input", {
        value: name,
        style: {
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-.02em",
          border: "none",
          background: "none",
          color: "var(--text)",
          fontFamily: "inherit",
          width: 160,
          outline: "none",
          borderBottom: "1px solid transparent",
        },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          cb.onEdit((editor) => editor.renameDay(dayId, e.target.value)),
      }),
      weekdayPicker,
      React.createElement("span", { style: { fontSize: 12, color: "var(--text3)" } }, summary),
      React.createElement(
        "button",
        {
          style: {
            marginLeft: "auto",
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--text2)",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: "7px 11px",
          },
          onClick: () => cb.onEdit((e) => e.removeDay(dayId)),
        },
        "Delete day",
      ),
    ),
    // Scrollable rows area
    React.createElement(
      "div",
      {
        style: {
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 11,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        },
      },
      ...renderedRows,
      addControls,
    ),
  );
}

export interface PlannerScreenProps {
  program: Program;
  library: ExerciseLibrary;
  editDayId: string | null;
  /** per-muscle planned volume bars for the coverage rail. */
  volumeBars: { muscle: string; name: string; sets: number; pct: number }[];
  coverage: Coverage;
  cb: PlannerCallbacks;
}

export function PlannerScreen(_p: PlannerScreenProps): JSX.Element {
  const { program, library, editDayId, volumeBars, coverage, cb } = _p;

  const columns = buildBoard(program, editDayId, library);
  const editor = buildEditor(program, editDayId, library);

  return React.createElement(
    "div",
    {
      style: {
        maxWidth: 1320,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      },
    },
    // Program header
    React.createElement(ProgramHeader, {
      name: program.name,
      type: program.type,
      schedule: program.schedule,
      cb,
    }),
    // Week board
    React.createElement(WeekBoard, { columns, cb }),
    // Editor + coverage rail row (when editor exists)
    editor !== null
      ? React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 16,
              alignItems: "stretch",
              flexWrap: "wrap" as const,
            },
          },
          // Day editor
          React.createElement(DayEditor, {
            editor,
            muscles: MUSCLES_ANATOMICAL,
            cb,
          }),
          // Coverage rail
          React.createElement(
            "div",
            {
              style: {
                width: 300,
                flex: "none",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 16,
                padding: "18px 16px",
              },
            },
            React.createElement(
              "div",
              { style: { fontSize: 14, fontWeight: 700 } },
              "Weekly coverage",
            ),
            React.createElement(
              "div",
              { style: { fontSize: 11, color: "var(--text3)", marginBottom: 8 } },
              "Sets per muscle across the plan",
            ),
            // BodyMap front + back
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "center",
                  gap: 10,
                  padding: "6px 0 10px",
                },
              },
              React.createElement(
                "div",
                {
                  style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: "9.5px",
                      color: "var(--text3)",
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: ".08em",
                    },
                  },
                  "FRONT",
                ),
                React.createElement(BodyMap, { side: "front", coverage }),
              ),
              React.createElement(
                "div",
                {
                  style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: "9.5px",
                      color: "var(--text3)",
                      fontFamily: "'JetBrains Mono',monospace",
                      letterSpacing: ".08em",
                    },
                  },
                  "BACK",
                ),
                React.createElement(BodyMap, { side: "back", coverage }),
              ),
            ),
            // Volume bars
            React.createElement(
              "div",
              { style: { borderTop: "1px solid var(--line)", paddingTop: 10 } },
              ...volumeBars.map((bar) =>
                React.createElement(
                  "div",
                  {
                    key: bar.muscle,
                    style: { display: "flex", alignItems: "center", gap: 9, padding: "4px 0" },
                  },
                  React.createElement(
                    "span",
                    { style: { width: 64, flex: "none", fontSize: 12 } },
                    bar.name,
                  ),
                  React.createElement(
                    "div",
                    {
                      style: {
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: "var(--surface2)",
                        position: "relative" as const,
                        overflow: "hidden",
                      },
                    },
                    React.createElement("div", {
                      style: {
                        position: "absolute" as const,
                        inset: 0,
                        width: `${bar.pct}%`,
                        background: "var(--accent)",
                        borderRadius: 3,
                      },
                    }),
                  ),
                  React.createElement(
                    "span",
                    {
                      style: {
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 11,
                        color: "var(--text2)",
                        width: 46,
                        textAlign: "right" as const,
                        flex: "none",
                      },
                    },
                    plural(bar.sets, "set"),
                  ),
                ),
              ),
            ),
          ),
        )
      : null,
  );
}
