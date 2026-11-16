// The logger: today's exercises on the left, one set at a time on the right.

import React from "react";
import type { CSSProperties } from "react";
import type { WeightUnit } from "@nabd/domain";
import { MUSCLE_NAMES, displayWeight, isTimeBased, isWeighted, plural } from "@nabd/domain";
import type { PlanItem, TodayPlan } from "@nabd/scheduling";
import type { AdviceWording, Coach, LogSession } from "@nabd/session";
import { describeAdvice, formatDuration, formatPerformance, formatTarget } from "@nabd/session";
import { AdviceCard, Stepper } from "@nabd/design-system";
import { CloseButton, EYEBROW, ModalShell } from "./modal-shell";

// ---------- view-model ----------

export interface SessionListRow {
  itemId: string;
  exercise: string;
  muscles: string;
  /** "2/4", or just "3" for an unplanned extra. */
  progress: string;
  complete: boolean;
  skipped: boolean;
  active: boolean;
}

export interface SessionVM {
  list: SessionListRow[];
  exercise: string;
  /** "Set 2 of 4", "Set 3" for extras, "All 4 sets done" once finished. */
  setLabel: string;
  /** What the plan asks for this set; null when nothing is prescribed. */
  target: string | null;
  notes: string;
  muscleNames: string[];
  /** Null for a warm-up, which is not something to progress on. */
  advice: AdviceWording | null;
  repsLabel: "Reps" | "Sec";
  reps: number;
  /** Load in the display unit; null for unweighted exercises. */
  weight: number | null;
  weightLabel: string;
  /** "Rest 1:20" while resting after the previous set; null otherwise. */
  restLabel: string | null;
  /** This exercise's sets logged today, oldest first. */
  logged: { id: string; text: string }[];
  /** Sets logged today across all exercises. */
  setsToday: number;
}

const musclesOf = (item: PlanItem): string[] =>
  [...item.exercise.primary, ...item.exercise.secondary].map((m) => MUSCLE_NAMES[m]);

function setLabel(item: PlanItem): string {
  if (item.isExtra) return `Set ${item.done + 1}`;
  if (item.remaining === 0) return `All ${plural(item.planned, "set")} done — extra set`;
  return `Set ${item.done + 1} of ${item.planned}`;
}

function weightLabel(item: PlanItem, unit: WeightUnit): string {
  if (item.exercise.tracking === "assisted_bodyweight") return `Assistance (${unit})`;
  if (item.exercise.tracking === "weighted_bodyweight") return `Added weight (${unit})`;
  return `Weight (${unit})`;
}

/** Null when the session's exercise is no longer in today's plan. */
export function buildSessionVM(input: {
  session: LogSession;
  plan: TodayPlan;
  coach: Coach;
  unit: WeightUnit;
  now: Date;
}): SessionVM | null {
  const { session, plan, coach, unit, now } = input;
  const item = plan.item(session.itemId);
  if (!item) return null;

  const { tracking } = item.exercise;
  const spec = item.nextSet;
  const rest = session.restRemaining(now);
  return {
    list: plan.items.map((i) => ({
      itemId: i.id,
      exercise: i.exercise.name,
      muscles: musclesOf(i).join(", "),
      progress: i.isExtra ? String(i.done) : `${i.done}/${i.planned}`,
      complete: i.status === "done",
      skipped: i.skipped,
      active: i.id === item.id,
    })),
    exercise: item.exercise.name,
    setLabel: setLabel(item),
    target: spec && item.prescription && formatTarget(spec, item.prescription),
    notes: item.prescription?.notes ?? "",
    muscleNames: musclesOf(item),
    advice: describeAdvice(coach.adviceFor(item), tracking, unit),
    repsLabel: isTimeBased(tracking) ? "Sec" : "Reps",
    reps: session.reps,
    weight: isWeighted(tracking) ? displayWeight(session.weight, unit) : null,
    weightLabel: weightLabel(item, unit),
    restLabel: rest > 0 ? `Rest ${formatDuration(rest)}` : null,
    logged: item.logged.map((set) => ({
      id: set.id,
      text: formatPerformance({ reps: set.value, weight: set.weight }, tracking, unit),
    })),
    setsToday: plan.setsDone,
  };
}

// ---------- component ----------

export interface SessionModalProps {
  vm: SessionVM;
  onPick: (itemId: string) => void;
  onStepReps: (direction: number) => void;
  onStepWeight: (direction: number) => void;
  onSetReps: (reps: number) => void;
  /** Weight typed in the display unit. */
  onSetWeight: (displayValue: number) => void;
  onApplyAdvice: (which: "primary" | "alternative") => void;
  onLog: () => void;
  onUndo: (setId: string) => void;
  /** Log an exercise that is not in today's plan. */
  onLogOther: () => void;
  onClose: () => void;
}

const MONO = "'JetBrains Mono', monospace";

const CHIP: CSSProperties = {
  fontSize: 12,
  color: "var(--text2)",
  background: "var(--surface2)",
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "5px 11px",
};

const STEPPER_CARD: CSSProperties = {
  flex: 1,
  background: "var(--surface2)",
  border: "1px solid var(--line)",
  borderRadius: 13,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};

const ELLIPSIS: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function ListRow(p: { row: SessionListRow; onPick: (itemId: string) => void }): JSX.Element {
  const { row } = p;
  return React.createElement(
    "button",
    {
      onClick: () => p.onPick(row.itemId),
      "data-row-active": row.active ? "true" : "false",
      style: {
        cursor: "pointer",
        padding: "9px 10px",
        background: row.active
          ? "color-mix(in oklch, var(--accent) 12%, transparent)"
          : "transparent",
        border: row.active
          ? "1px solid color-mix(in oklch, var(--accent) 30%, transparent)"
          : "1px solid transparent",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        gap: 9,
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
        color: "var(--text)",
        opacity: row.skipped ? 0.5 : 1,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: "50%",
          background: row.complete ? "var(--accent2)" : "var(--surface)",
          border: row.complete ? "none" : "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      row.complete
        ? React.createElement(
            "svg",
            {
              "aria-label": "complete",
              width: 12,
              height: 12,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "#fff",
              strokeWidth: 3.4,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            React.createElement("path", { d: "M20 6 9 17l-5-5" }),
          )
        : null,
    ),
    React.createElement(
      "div",
      { style: { flex: 1, minWidth: 0 } },
      React.createElement(
        "div",
        {
          style: {
            ...ELLIPSIS,
            fontSize: 13,
            fontWeight: 600,
            color: row.active ? "var(--accent)" : "var(--text)",
          },
        },
        row.exercise,
      ),
      React.createElement(
        "div",
        { style: { ...ELLIPSIS, fontSize: 11, color: "var(--text3)" } },
        row.skipped ? "Skipped today" : row.muscles,
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          fontFamily: MONO,
          fontSize: 11,
          color: row.complete ? "var(--accent2)" : "var(--text3)",
          flexShrink: 0,
        },
      },
      row.progress,
    ),
  );
}

function StepperCard(p: {
  label: string;
  value: number;
  onStep: (direction: number) => void;
  onSet: (value: number) => void;
}): JSX.Element {
  return React.createElement(
    "div",
    { style: STEPPER_CARD },
    React.createElement(
      "span",
      { style: { ...EYEBROW, fontSize: 11, fontWeight: 400, letterSpacing: ".06em" } },
      p.label,
    ),
    React.createElement(Stepper, {
      value: p.value,
      onDec: () => p.onStep(-1),
      onInc: () => p.onStep(1),
      onSet: p.onSet,
      ariaLabel: p.label,
    }),
  );
}

export function SessionModal(p: SessionModalProps): JSX.Element {
  const { vm } = p;

  const header = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "20px 22px 16px",
        borderBottom: "1px solid var(--line)",
      },
    },
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { ...EYEBROW, fontSize: 10.5, letterSpacing: ".12em", color: "var(--accent)" } },
        "LOG SETS",
      ),
      React.createElement(
        "div",
        { style: { fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 } },
        "This break",
      ),
      React.createElement(
        "div",
        { style: { fontSize: 12, color: "var(--text2)", marginTop: 3 } },
        "One set, or as many as you have time for — switch exercises freely.",
      ),
    ),
    React.createElement(CloseButton, { onClose: p.onClose }),
  );

  const leftPane = React.createElement(
    "div",
    {
      style: {
        width: 248,
        flexShrink: 0,
        borderRight: "1px solid var(--line)",
        padding: "16px 14px",
        overflowY: "auto",
      },
    },
    React.createElement(
      "div",
      { style: { ...EYEBROW, marginBottom: 10, padding: "0 4px" } },
      "TODAY'S EXERCISES",
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 3 } },
      ...vm.list.map((row) =>
        React.createElement(ListRow, { key: row.itemId, row, onPick: p.onPick }),
      ),
    ),
    React.createElement(
      "button",
      {
        onClick: p.onLogOther,
        style: {
          marginTop: 10,
          width: "100%",
          background: "transparent",
          border: "1px dashed var(--line)",
          borderRadius: 10,
          padding: "9px 10px",
          fontSize: 12.5,
          fontFamily: "inherit",
          color: "var(--text2)",
          cursor: "pointer",
        },
      },
      "+ Something else",
    ),
  );

  const rightPane = React.createElement(
    "div",
    {
      style: {
        flex: 1,
        minWidth: 0,
        padding: "20px 22px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      },
    },
    React.createElement(
      "div",
      { style: { fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" } },
      vm.exercise,
    ),
    React.createElement(
      "div",
      { style: { fontSize: 12.5, color: "var(--accent)", fontFamily: MONO, marginTop: 4 } },
      [vm.setLabel, vm.target].filter((part) => part !== null).join(" · "),
    ),
    vm.notes !== ""
      ? React.createElement(
          "div",
          { style: { fontSize: 12.5, color: "var(--text3)", fontStyle: "italic", marginTop: 6 } },
          vm.notes,
        )
      : null,
    React.createElement(
      "div",
      { style: { display: "flex", gap: 7, flexWrap: "wrap", margin: "13px 0 16px" } },
      ...vm.muscleNames.map((name) =>
        React.createElement("span", { key: name, style: CHIP }, name),
      ),
    ),
    vm.advice !== null
      ? React.createElement(AdviceCard, { advice: vm.advice, onApply: p.onApplyAdvice })
      : null,
    React.createElement(
      "div",
      { style: { display: "flex", gap: 12, marginTop: 16 } },
      React.createElement(StepperCard, {
        label: vm.repsLabel,
        value: vm.reps,
        onStep: p.onStepReps,
        onSet: p.onSetReps,
      }),
      vm.weight !== null
        ? React.createElement(StepperCard, {
            label: vm.weightLabel,
            value: vm.weight,
            onStep: p.onStepWeight,
            onSet: p.onSetWeight,
          })
        : null,
    ),
    React.createElement(
      "button",
      {
        onClick: p.onLog,
        style: {
          marginTop: 14,
          width: "100%",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: 15,
          fontSize: 14.5,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
        },
      },
      "Log this set",
    ),
    vm.restLabel !== null
      ? React.createElement(
          "div",
          {
            "data-rest": true,
            style: {
              marginTop: 10,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 13,
              color: "var(--accent2)",
            },
          },
          vm.restLabel,
        )
      : null,
    React.createElement(
      "div",
      { style: { marginTop: 18 } },
      React.createElement("div", { style: { ...EYEBROW, marginBottom: 9 } }, "LOGGED TODAY"),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 6 } },
        ...vm.logged.map((set, index) =>
          React.createElement(
            "div",
            {
              key: set.id,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--surface2)",
                border: "1px solid var(--line)",
                borderRadius: 9,
                padding: "8px 11px",
                fontSize: 12.5,
              },
            },
            React.createElement("span", { style: { color: "var(--text2)" } }, `Set ${index + 1}`),
            React.createElement(
              "span",
              {
                style: {
                  fontFamily: MONO,
                  color: "var(--text)",
                  fontWeight: 600,
                  marginLeft: "auto",
                },
              },
              set.text,
            ),
            React.createElement(
              "button",
              {
                onClick: () => p.onUndo(set.id),
                "aria-label": `Delete set ${index + 1}`,
                title: "Delete this set",
                style: {
                  background: "transparent",
                  border: "none",
                  color: "var(--text3)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: 2,
                },
              },
              "✕",
            ),
          ),
        ),
      ),
    ),
  );

  const footer = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 22px",
        borderTop: "1px solid var(--line)",
      },
    },
    React.createElement(
      "span",
      { style: { fontSize: 12.5, color: "var(--text3)" } },
      vm.setsToday === 0
        ? "No sets logged yet today"
        : `${plural(vm.setsToday, "set")} logged today`,
    ),
    React.createElement(
      "button",
      {
        onClick: p.onClose,
        style: {
          background: "var(--accent2)",
          color: "#fff",
          border: "none",
          borderRadius: 11,
          padding: "12px 22px",
          fontSize: 14,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
        },
      },
      "Done",
    ),
  );

  return React.createElement(
    ModalShell,
    {
      onClose: p.onClose,
      zIndex: 70,
      panelStyle: {
        width: 720,
        maxHeight: "86vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: 20,
        overflow: "hidden",
      },
    },
    header,
    React.createElement(
      "div",
      { style: { display: "flex", flex: 1, minHeight: 0 } },
      leftPane,
      rightPane,
    ),
    footer,
  );
}
