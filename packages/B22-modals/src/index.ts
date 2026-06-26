// @nabd/modals — overlays: session logger (two-pane), notification toast,
// exercise library, settings, full-history chart. Presentational; props-driven.

import React from "react";
import type { ReactNode } from "react";
import type { ActiveSession, Slot, Settings, Theme, MuscleGroup } from "@nabd/domain";
import { MUSCLE_NAMES, GLASS_OPACITY } from "@nabd/domain";
import { trendPoints } from "@nabd/progression";
import { Stepper, Segmented, Toggle, Button, Icon } from "@nabd/design-system";

// ---------------------------------------------------------------------------
// ModalShell
// ---------------------------------------------------------------------------

/** Generic modal backdrop+panel wrapper (click-outside closes). */
export interface ModalShellProps {
  onClose: () => void;
  width?: number;
  children?: ReactNode;
}
export function ModalShell(_p: ModalShellProps): JSX.Element {
  const { onClose, width, children } = _p;

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      },
    },
    React.createElement(
      "div",
      {
        onClick: handlePanelClick,
        style: {
          background: "var(--modal-bg)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,.3)",
          width: width ?? 720,
          maxWidth: "100%",
          maxHeight: "90vh",
          boxSizing: "border-box" as const,
          animation: "nb-fade .22s ease",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column" as const,
        },
      },
      children,
    ),
  );
}

// ---------------------------------------------------------------------------
// Session logger (two-pane)
// ---------------------------------------------------------------------------

export interface SessionExerciseRow {
  slotId: string;
  exercise: string;
  muscles: string; // joined names
  done: number;
  sets: number;
  complete: boolean;
  active: boolean;
}

/** Left-pane list from today's slots + the active session. */
export function buildSessionList(_slots: Slot[], _activeSlotId: string): SessionExerciseRow[] {
  return _slots.map((slot) => {
    const muscles = slot.muscles.map((m) => MUSCLE_NAMES[m]).join(", ");
    return {
      slotId: slot.id,
      exercise: slot.exercise,
      muscles,
      done: slot.done,
      sets: slot.sets,
      complete: slot.done >= slot.sets,
      active: slot.id === _activeSlotId,
    };
  });
}

export interface SessionModalProps {
  session: ActiveSession;
  list: SessionExerciseRow[];
  /** "Set X of Y" for the active exercise. */
  setOfLabel: string;
  onPick: (slotId: string) => void;
  onStepReps: (d: number) => void;
  onStepWeight: (d: number) => void;
  onLog: () => void;
  onClose: () => void;
}

export function SessionModal(_p: SessionModalProps): JSX.Element {
  const { session, list, setOfLabel, onPick, onStepReps, onStepWeight, onLog, onClose } = _p;

  // Left pane: list of exercises
  const leftRows = list.map((row) => {
    const dotStyle: React.CSSProperties = {
      width: 20,
      height: 20,
      flex: "none" as const,
      borderRadius: "50%",
      background: row.complete ? "var(--accent2)" : "var(--surface)",
      border: row.complete ? "none" : "1px solid var(--line)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    const rowStyle: React.CSSProperties = {
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
      textAlign: "left" as const,
      width: "100%",
      fontFamily: "inherit",
      color: "var(--text)",
    };

    const progStyle: React.CSSProperties = {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      color: row.complete ? "var(--accent2)" : "var(--text3)",
      flexShrink: 0,
    };

    return React.createElement(
      "button",
      {
        key: row.slotId,
        onClick: () => onPick(row.slotId),
        "data-row-active": row.active ? "true" : "false",
        style: rowStyle,
      },
      React.createElement(
        "div",
        { style: dotStyle },
        row.complete
          ? React.createElement(
              "svg",
              {
                "data-complete": "true",
                "aria-label": "complete",
                width: 12,
                height: 12,
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "#fff",
                strokeWidth: "3.4",
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
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
              color: row.active ? "var(--accent)" : "var(--text)",
            },
          },
          row.exercise,
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11,
              color: "var(--text3)",
              whiteSpace: "nowrap" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          },
          row.muscles,
        ),
      ),
      React.createElement("div", { style: progStyle }, `${row.done}/${row.sets}`),
    );
  });

  // Muscles display for active session
  const muscleChips = session.muscles.map((m) =>
    React.createElement(
      "span",
      {
        key: m,
        style: {
          fontSize: 12,
          color: "var(--text2)",
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          padding: "5px 11px",
        },
      },
      MUSCLE_NAMES[m],
    ),
  );

  // Footer text
  const footerText =
    session.logged.length === 0
      ? "No sets logged yet"
      : `${session.logged.length} sets logged this session`;

  // Suggestion badge
  const suggBadge = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 11,
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "13px 15px",
        marginTop: 16,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 8,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(
        "svg",
        {
          width: 16,
          height: 16,
          viewBox: "0 0 24 24",
          fill: "#fff",
        },
        React.createElement("path", { d: "M13 2 4 14h6l-1 8 9-12h-6z" }),
      ),
    ),
    React.createElement(
      "div",
      { style: { lineHeight: 1.4 } },
      React.createElement(
        "div",
        { style: { fontSize: 13.5 } },
        React.createElement(
          "b",
          { style: { fontFamily: "'JetBrains Mono', monospace" } },
          session.sugg.note,
        ),
        " suggested",
      ),
    ),
  );

  // Rep/sec stepper card
  const repLabel = session.unit === "sec" ? "Sec" : "Reps";
  const repStepperCard = React.createElement(
    "div",
    {
      style: {
        flex: 1,
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 13,
        padding: 14,
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: 10,
      },
    },
    React.createElement(
      "span",
      {
        style: {
          fontSize: 11,
          color: "var(--text3)",
          letterSpacing: ".06em",
          fontFamily: "'JetBrains Mono', monospace",
        },
      },
      repLabel,
    ),
    React.createElement(Stepper, {
      value: session.reps,
      onDec: () => onStepReps(-1),
      onInc: () => onStepReps(1),
    }),
  );

  // Weight stepper card
  const weightStepperCard = session.weighted
    ? React.createElement(
        "div",
        {
          style: {
            flex: 1,
            background: "var(--surface2)",
            border: "1px solid var(--line)",
            borderRadius: 13,
            padding: 14,
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: 10,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              color: "var(--text3)",
              letterSpacing: ".06em",
              fontFamily: "'JetBrains Mono', monospace",
            },
          },
          "Weight",
        ),
        React.createElement(Stepper, {
          value: session.weight,
          onDec: () => onStepWeight(-1),
          onInc: () => onStepWeight(1),
        }),
      )
    : null;

  // Right pane
  const rightPane = React.createElement(
    "div",
    {
      style: {
        flex: 1,
        minWidth: 0,
        padding: "20px 22px",
        overflowY: "auto" as const,
        display: "flex",
        flexDirection: "column" as const,
      },
    },
    React.createElement(
      "div",
      { style: { fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" } },
      session.exercise,
    ),
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12.5,
          color: "var(--accent)",
          fontFamily: "'JetBrains Mono', monospace",
          marginTop: 4,
        },
      },
      setOfLabel,
    ),
    React.createElement(
      "div",
      { style: { display: "flex", gap: 7, flexWrap: "wrap" as const, marginTop: 13 } },
      ...muscleChips,
    ),
    suggBadge,
    React.createElement(
      "div",
      { style: { display: "flex", gap: 12, marginTop: 16 } },
      repStepperCard,
      weightStepperCard,
    ),
    React.createElement(
      "button",
      {
        onClick: onLog,
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
    React.createElement(
      "div",
      { style: { marginTop: 18 } },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: ".1em",
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 9,
          },
        },
        "LOGGED THIS SESSION",
      ),
    ),
  );

  // Header
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
        {
          style: {
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: ".12em",
            color: "var(--accent)",
            fontFamily: "'JetBrains Mono', monospace",
          },
        },
        "LOG SETS",
      ),
      React.createElement(
        "div",
        { style: { fontSize: 20, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 } },
        "This session",
      ),
      React.createElement(
        "div",
        { style: { fontSize: 12, color: "var(--text2)", marginTop: 3 } },
        "Log a set for any exercise — switch freely between them.",
      ),
    ),
    React.createElement(
      "button",
      {
        onClick: onClose,
        "aria-label": "Close",
        style: {
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 9,
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--text2)",
          flexShrink: 0,
        },
      },
      React.createElement(
        "svg",
        {
          width: 15,
          height: 15,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2.2",
          strokeLinecap: "round",
        },
        React.createElement("path", { d: "M18 6 6 18M6 6l12 12" }),
      ),
    ),
  );

  // Left pane
  const leftPane = React.createElement(
    "div",
    {
      style: {
        width: 248,
        flexShrink: 0,
        borderRight: "1px solid var(--line)",
        padding: "16px 14px",
        overflowY: "auto" as const,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".1em",
          color: "var(--text3)",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 10,
          padding: "0 4px",
        },
      },
      "TODAY'S EXERCISES",
    ),
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column" as const, gap: 3 } },
      ...leftRows,
    ),
  );

  // Footer
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
    React.createElement("span", { style: { fontSize: 12.5, color: "var(--text3)" } }, footerText),
    React.createElement(
      "button",
      {
        onClick: onClose,
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

  // Use ModalShell with no inner overflow:hidden so two-pane scrolls properly
  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: 20,
      },
    },
    React.createElement(
      "div",
      {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        style: {
          width: 720,
          maxWidth: "100%",
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column" as const,
          background: "var(--modal-bg)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          boxShadow: "var(--cardshadow, 0 24px 70px rgba(0,0,0,.3))",
          animation: "nb-fade .22s ease",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
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
    ),
  );
}

// ---------------------------------------------------------------------------
// Notification toast
// ---------------------------------------------------------------------------

export interface ToastProps {
  reasonLabel: string; // "Interval's up" / "You've gone quiet"
  exercise: string;
  sub: string; // "<group> · <time>"
  onConfirm: () => void;
  onSnooze: () => void;
}
export function NotificationToast(_p: ToastProps): JSX.Element {
  const { reasonLabel, exercise, sub, onConfirm, onSnooze } = _p;

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 330,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        boxShadow: "0 18px 50px rgba(0,0,0,.22)",
        padding: 18,
        zIndex: 60,
        animation: "nb-toast .28s ease",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        },
      },
      React.createElement("span", {
        style: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--accent)",
          animation: "nb-blink 1.1s infinite",
          display: "inline-block",
        },
      }),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: ".12em",
            color: "var(--accent)",
            fontFamily: "'JetBrains Mono', monospace",
          },
        },
        "TIME TO MOVE",
      ),
      React.createElement(
        "span",
        { style: { marginLeft: "auto", fontSize: 11, color: "var(--text3)" } },
        reasonLabel,
      ),
    ),
    React.createElement(
      "div",
      { style: { fontSize: 19, fontWeight: 800, letterSpacing: "-.02em" } },
      exercise,
    ),
    React.createElement(
      "div",
      { style: { fontSize: 12.5, color: "var(--text3)", marginTop: 3 } },
      sub,
    ),
    React.createElement(
      "div",
      { style: { display: "flex", gap: 9, marginTop: 15 } },
      React.createElement(
        "button",
        {
          onClick: onConfirm,
          style: {
            flex: 1,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: 11,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
          },
        },
        "Let's go",
      ),
      React.createElement(
        "button",
        {
          onClick: onSnooze,
          style: {
            background: "transparent",
            color: "var(--text2)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "11px 15px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          },
        },
        "Snooze",
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------

export interface LibraryItem {
  id: string;
  name: string;
  muscles: string;
  trackLabel: string;
  equip: string;
  custom: boolean;
}
export interface LibraryModalProps {
  open: boolean;
  title: string;
  profileName: string;
  browsing: boolean;
  creating: boolean;
  search: string;
  groupChips: { k: string; label: string; active: boolean }[];
  items: LibraryItem[];
  emptyMsg: string;
  createLabel: string;
  // create form
  draftName: string;
  draftGroup: MuscleGroup;
  draftTrack: string;
  draftEquip: string;
  groupOptions: { k: string; n: string }[];
  trackOptions: { k: string; n: string }[];
  eqOptions: { k: string; n: string }[];
  secondaryChips: { k: string; label: string; active: boolean }[];
  onClose: () => void;
  onSearch: (q: string) => void;
  onGroup: (g: string) => void;
  onPick: (exId: string) => void;
  onCopy: (exId: string) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onDraft: (k: string, v: string) => void;
  onToggleSecondary: (m: string) => void;
  onCreate: () => void;
}

export function LibraryModal(_p: LibraryModalProps): JSX.Element {
  const {
    open,
    title,
    browsing,
    search,
    groupChips,
    items,
    emptyMsg,
    createLabel,
    draftName,
    draftGroup,
    draftTrack,
    draftEquip,
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
  } = _p;

  if (!open) return null as unknown as JSX.Element;

  const chipBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    padding: "5px 12px",
    borderRadius: 8,
    border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
    background: active ? "color-mix(in oklch, var(--accent) 15%, transparent)" : "var(--surface2)",
    color: active ? "var(--accent)" : "var(--text2)",
    cursor: "pointer",
    fontFamily: "inherit",
  });

  const closeBtn = React.createElement(
    "button",
    {
      onClick: onClose,
      "aria-label": "Close",
      style: {
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 9,
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--text2)",
      },
    },
    React.createElement(
      "svg",
      {
        width: 14,
        height: 14,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.2",
        strokeLinecap: "round",
      },
      React.createElement("path", { d: "M18 6 6 18M6 6l12 12" }),
    ),
  );

  let content: ReactNode;

  if (browsing) {
    // Group filter chips
    const chips = groupChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onGroup(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
          style: chipBtnStyle(chip.active),
        },
        chip.label,
      ),
    );

    // Items list
    const itemRows =
      items.length === 0
        ? [
            React.createElement(
              "div",
              {
                key: "empty",
                style: {
                  fontSize: 12.5,
                  color: "var(--text3)",
                  textAlign: "center" as const,
                  padding: "14px 18px 6px",
                },
              },
              emptyMsg,
            ),
          ]
        : items.map((item) =>
            React.createElement(
              "div",
              {
                key: item.id,
                style: { display: "flex", alignItems: "stretch", gap: 7 },
              },
              React.createElement(
                "button",
                {
                  "aria-label": "add",
                  onClick: () => onPick(item.id),
                  style: {
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left" as const,
                    background: "var(--surface2)",
                    border: "1px solid var(--line)",
                    borderRadius: 11,
                    padding: "12px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--text)",
                  },
                },
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                      },
                    },
                    item.name,
                    item.custom
                      ? React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 9,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: "var(--accent)",
                              border: "1px solid var(--accent)",
                              borderRadius: 5,
                              padding: "1px 5px",
                              letterSpacing: ".04em",
                            },
                          },
                          "CUSTOM",
                        )
                      : null,
                  ),
                  React.createElement(
                    "div",
                    { style: { fontSize: 11, color: "var(--text3)", marginTop: 2 } },
                    `${item.muscles} · ${item.trackLabel} · ${item.equip}`,
                  ),
                ),
                React.createElement(
                  "span",
                  {
                    style: { color: "var(--accent)", fontSize: 18, fontWeight: 700, flexShrink: 0 },
                  },
                  "+",
                ),
              ),
              React.createElement(
                "button",
                {
                  "aria-label": "duplicate",
                  onClick: () => onCopy(item.id),
                  title: "Duplicate & edit",
                  style: {
                    flexShrink: 0,
                    width: 42,
                    background: "var(--surface2)",
                    border: "1px solid var(--line)",
                    borderRadius: 11,
                    cursor: "pointer",
                    color: "var(--text3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                },
                React.createElement(
                  "svg",
                  {
                    width: 15,
                    height: 15,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.8",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  React.createElement("rect", { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
                  React.createElement("path", { d: "M5 15V5a2 2 0 0 1 2-2h10" }),
                ),
              ),
            ),
          );

    content = React.createElement(
      "div",
      null,
      React.createElement("input", {
        type: "search",
        role: "searchbox",
        value: search,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
        placeholder: "Search exercises…",
        style: {
          marginTop: 12,
          width: "100%",
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "11px 13px",
          fontSize: 13.5,
          fontFamily: "inherit",
          color: "var(--text)",
          outline: "none",
          boxSizing: "border-box" as const,
        },
      }),
      React.createElement(
        "div",
        { style: { padding: "12px 16px 0", display: "flex", gap: 7, flexWrap: "wrap" as const } },
        ...chips,
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "12px 16px 16px",
            display: "flex",
            flexDirection: "column" as const,
            gap: 7,
          },
        },
        ...itemRows,
        React.createElement(
          "button",
          {
            onClick: onStartCreate,
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "none",
              border: "1.5px dashed var(--accent)",
              borderRadius: 11,
              padding: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              color: "var(--accent)",
              fontSize: 13.5,
              fontWeight: 700,
              marginTop: 4,
            },
          },
          createLabel,
        ),
      ),
    );
  } else {
    // creating mode
    const secChips = secondaryChips.map((chip) =>
      React.createElement(
        "button",
        {
          key: chip.k,
          onClick: () => onToggleSecondary(chip.k),
          "data-active": chip.active ? "true" : undefined,
          "aria-pressed": chip.active ? "true" : "false",
          style: chipBtnStyle(chip.active),
        },
        chip.label,
      ),
    );

    const inputStyle: React.CSSProperties = {
      width: "100%",
      background: "var(--surface2)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: "12px 13px",
      fontSize: 14,
      fontFamily: "inherit",
      color: "var(--text)",
      outline: "none",
      boxSizing: "border-box" as const,
    };

    const labelStyle: React.CSSProperties = {
      fontSize: 10,
      color: "var(--text3)",
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: ".08em",
      marginBottom: 7,
    };

    content = React.createElement(
      "div",
      {
        style: {
          padding: "18px 18px 20px",
          display: "flex",
          flexDirection: "column" as const,
          gap: 16,
        },
      },
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "EXERCISE NAME"),
        React.createElement("input", {
          type: "text",
          value: draftName,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => onDraft("name", e.target.value),
          placeholder: "Exercise name",
          style: inputStyle,
        }),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "PRIMARY MUSCLE GROUP"),
        React.createElement(
          "select",
          {
            value: draftGroup,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDraft("group", e.target.value),
            style: inputStyle,
          },
          ...groupOptions.map((opt) =>
            React.createElement("option", { key: opt.k, value: opt.k, label: opt.n }),
          ),
        ),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "HOW TO TRACK IT"),
        React.createElement(
          "select",
          {
            value: draftTrack,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDraft("track", e.target.value),
            style: inputStyle,
          },
          ...trackOptions.map((opt) =>
            React.createElement("option", { key: opt.k, value: opt.k, label: opt.n }),
          ),
        ),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "EQUIPMENT"),
        React.createElement(
          "select",
          {
            value: draftEquip,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDraft("equip", e.target.value),
            style: inputStyle,
          },
          ...eqOptions.map((opt) =>
            React.createElement("option", { key: opt.k, value: opt.k, label: opt.n }),
          ),
        ),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("div", { style: labelStyle }, "SECONDARY MUSCLES"),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" as const } },
          ...secChips,
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 10, marginTop: 4 } },
        React.createElement(
          "button",
          {
            onClick: onCreate,
            style: {
              flex: 1,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 11,
              padding: 13,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            },
          },
          "Create",
        ),
        React.createElement(
          "button",
          {
            onClick: onCancelCreate,
            style: {
              background: "transparent",
              color: "var(--text2)",
              border: "1px solid var(--line)",
              borderRadius: 11,
              padding: "13px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            },
          },
          "Back",
        ),
      ),
    );
  }

  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 20,
      },
    },
    React.createElement(
      "div",
      {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        style: {
          width: 560,
          maxWidth: "100%",
          height: 680,
          maxHeight: "90vh",
          background: "var(--modal-bg)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,.3)",
          display: "flex",
          flexDirection: "column" as const,
          overflow: "hidden",
          animation: "nb-fade .22s ease",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--line)",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement("div", { style: { fontWeight: "bold", marginBottom: 12 } }, title),
          closeBtn,
        ),
        content,
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SettingsModalProps {
  settings: Settings;
  /** Light or dark base theme. */
  theme: Theme;
  /** Whether the glass (translucent) mode is active. */
  glass: boolean;
  onClose: () => void;
  onTheme: (t: Theme) => void;
  /** Toggle the glass overlay on/off. */
  onToggleGlass: () => void;
  onOpacity: (d: number) => void;
  onToggleStartup: () => void;
  onToggleMinimized: () => void;
  onInterval: (d: number) => void;
  onIdleNudge: (d: number) => void;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsModal(_p: SettingsModalProps): JSX.Element {
  const {
    settings,
    theme,
    glass,
    onClose,
    onTheme,
    onToggleGlass,
    onOpacity,
    onToggleStartup,
    onToggleMinimized,
    onInterval,
    onIdleNudge,
    onExport,
    onImport,
  } = _p;

  const themeOptions = [
    { k: "light", label: "Light" },
    { k: "dark", label: "Dark" },
  ];

  const sectionLabel = (text: string) =>
    React.createElement(
      "div",
      {
        style: {
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".1em",
          color: "var(--text3)",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 12,
        },
      },
      text,
    );

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const rowLabelBlock = (title: string, desc: string) =>
    React.createElement(
      "div",
      null,
      React.createElement("div", { style: { fontSize: 14, fontWeight: 600 } }, title),
      React.createElement(
        "div",
        { style: { fontSize: 11.5, color: "var(--text3)", marginTop: 2 } },
        desc,
      ),
    );

  // Display floor-clamped opacity percentage
  const { floor } = GLASS_OPACITY[theme];
  const clampedOpacity = Math.max(floor, Math.min(0.92, settings.opacity));
  const opacityPct = Math.round(clampedOpacity * 100) + "%";

  // Glass sub-panel (opacity only) — shown when glass is on
  // Translucency frosts the actual OS desktop; no wallpaper picker needed.
  const glassSubPanel = glass
    ? React.createElement(
        "div",
        {
          style: {
            background: "var(--surface2)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "14px 15px",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { fontSize: 13, fontWeight: 600 } },
              "Background opacity",
            ),
            React.createElement(
              "div",
              { style: { fontSize: 11.5, color: "var(--text3)", marginTop: 2 } },
              "Higher = more solid. Has a floor so text stays readable.",
            ),
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 12 } },
            React.createElement(Stepper, {
              value: opacityPct,
              onDec: () => onOpacity(-1),
              onInc: () => onOpacity(1),
            }),
          ),
        ),
      )
    : null;

  // Toggle row helper — uses the shared Toggle primitive (pill track + knob, accent when on)
  const toggleRow = (
    label: string,
    desc: string,
    checked: boolean,
    dataLabel: string,
    onToggle: () => void,
    borderTop?: boolean,
  ) =>
    React.createElement(
      "div",
      {
        "data-toggle-row": dataLabel,
        style: {
          ...rowStyle,
          padding: "6px 0",
          ...(borderTop ? { borderTop: "1px solid var(--line)", marginTop: 6 } : {}),
        },
      },
      rowLabelBlock(label, desc),
      React.createElement(Toggle, {
        on: checked,
        onChange: onToggle,
      }),
    );

  // Notification stepper row
  const stepperRow = (
    label: string,
    desc: string,
    value: number | string,
    ariaLabel: string,
    onDec: () => void,
    onInc: () => void,
    borderTop?: boolean,
  ) =>
    React.createElement(
      "div",
      {
        style: {
          ...rowStyle,
          padding: "8px 0",
          ...(borderTop ? { borderTop: "1px solid var(--line)" } : {}),
        },
      },
      rowLabelBlock(label, desc),
      React.createElement(
        "div",
        { "aria-label": ariaLabel },
        React.createElement(Stepper, {
          value,
          onDec,
          onInc,
        }),
      ),
    );

  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: 20,
      },
    },
    React.createElement(
      "div",
      {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        style: {
          width: 520,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto" as const,
          background: "var(--modal-bg)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,.4)",
          animation: "nb-fade .22s ease",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        },
      },
      // Sticky header
      React.createElement(
        "div",
        {
          style: {
            position: "sticky" as const,
            top: 0,
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px 14px",
            borderBottom: "1px solid var(--line)",
            zIndex: 2,
          },
        },
        React.createElement(
          "div",
          { style: { fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" } },
          "Settings",
        ),
        React.createElement(
          "button",
          {
            "aria-label": "Close",
            onClick: onClose,
            style: {
              background: "var(--surface2)",
              border: "1px solid var(--line)",
              borderRadius: 9,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text2)",
            },
          },
          React.createElement(
            "svg",
            {
              width: 14,
              height: 14,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.2",
              strokeLinecap: "round",
            },
            React.createElement("path", { d: "M18 6 6 18M6 6l12 12" }),
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "18px 22px 24px",
            display: "flex",
            flexDirection: "column" as const,
            gap: 22,
          },
        },

        // APPEARANCE
        React.createElement(
          "div",
          null,
          sectionLabel("APPEARANCE"),
          // Theme row
          React.createElement(
            "div",
            { style: { ...rowStyle, marginBottom: 14 } },
            rowLabelBlock("Theme", "Sets text & contrast — your theme, not the wallpaper."),
            React.createElement(Segmented, {
              options: themeOptions,
              value: theme,
              onChange: (k: string) => onTheme(k as Theme),
            }),
          ),
          // Translucent window toggle row
          React.createElement(
            "div",
            { style: { ...rowStyle, padding: "6px 0 14px" } },
            rowLabelBlock("Translucent window", "Frost the panels so your desktop shows through."),
            React.createElement(Toggle, {
              on: glass,
              onChange: () => onToggleGlass(),
            }),
          ),
          // Glass sub-panel (opacity + wallpapers) when glass is on
          glassSubPanel,
        ),

        // STARTUP
        React.createElement(
          "div",
          null,
          sectionLabel("STARTUP"),
          toggleRow(
            "Open at startup",
            "Launch Nabd when you log in.",
            settings.openAtStartup,
            "Open at Startup",
            onToggleStartup,
          ),
          toggleRow(
            "Start minimized",
            "Sit quietly in the tray until a set is due.",
            settings.minimizedByDefault,
            "Start Minimized",
            onToggleMinimized,
            true,
          ),
        ),

        // NOTIFICATIONS
        React.createElement(
          "div",
          null,
          sectionLabel("NOTIFICATIONS"),
          stepperRow(
            "Interval",
            "Timer length before the next nudge.",
            `${settings.interval} min`,
            "Interval",
            () => onInterval(-1),
            () => onInterval(1),
          ),
          stepperRow(
            "Idle nudge",
            "No keyboard/mouse for this long → suggest a set.",
            `${settings.idleNudge} sec`,
            "Idle nudge",
            () => onIdleNudge(-1),
            () => onIdleNudge(1),
            true,
          ),
        ),

        // DATA
        React.createElement(
          "div",
          null,
          sectionLabel("DATA"),
          React.createElement(
            "div",
            { style: { display: "flex", gap: 10 } },
            React.createElement(
              Button,
              {
                variant: "ghost",
                onClick: onExport,
                style: {
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "var(--surface2)",
                  border: "1px solid var(--line)",
                  borderRadius: 11,
                  padding: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  color: "var(--text)",
                  cursor: "pointer",
                },
              },
              React.createElement(Icon, { name: "download", size: 15 }),
              "Export data",
            ),
            React.createElement(
              Button,
              {
                variant: "ghost",
                onClick: onImport,
                style: {
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "var(--surface2)",
                  border: "1px solid var(--line)",
                  borderRadius: 11,
                  padding: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  color: "var(--text)",
                  cursor: "pointer",
                },
              },
              React.createElement(Icon, { name: "upload", size: 15 }),
              "Import data",
            ),
          ),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Full-history chart
// ---------------------------------------------------------------------------

export interface ChartVM {
  exercise: string;
  startLabel: string;
  nowLabel: string;
  sessions: number;
  pr: string;
  current: string;
  gainAll: string;
  /** SVG polyline + area points. */
  points: string;
  areaPoints: string;
  viewBox: string;
  gridY: { y: string; label: string }[];
}
export interface ChartModalProps {
  vm: ChartVM;
  onClose: () => void;
}
export function FullHistoryChartModal(_p: ChartModalProps): JSX.Element {
  const { vm, onClose } = _p;

  const gridLines = vm.gridY.map((g, i) =>
    React.createElement(
      "g",
      { key: i },
      React.createElement("line", {
        x1: 30,
        x2: 650,
        y1: g.y,
        y2: g.y,
        stroke: "var(--line)",
        strokeWidth: 1,
      }),
      React.createElement(
        "text",
        {
          x: 6,
          y: g.y,
          dy: 4,
          fill: "var(--text3)",
          fontSize: 11,
        },
        g.label,
      ),
    ),
  );

  const statTile = (label: string, value: string | number, color?: string) =>
    React.createElement(
      "div",
      {
        style: {
          flex: 1,
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "13px 15px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 10.5,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: ".04em",
          },
        },
        label,
      ),
      React.createElement(
        "div",
        {
          style: {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 21,
            fontWeight: 600,
            marginTop: 5,
            ...(color ? { color } : {}),
          },
        },
        value,
      ),
    );

  return React.createElement(
    "div",
    {
      "data-modal-backdrop": true,
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        padding: 20,
      },
    },
    React.createElement(
      "div",
      {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
        style: {
          width: 760,
          maxWidth: "100%",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(0,0,0,.3)",
          padding: 24,
          animation: "nb-fade .22s ease",
        },
      },
      // Header
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          },
        },
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: "var(--accent)",
                fontFamily: "'JetBrains Mono', monospace",
              },
            },
            "FULL HISTORY",
          ),
          React.createElement(
            "div",
            { style: { fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginTop: 5 } },
            vm.exercise,
          ),
          React.createElement(
            "div",
            { style: { fontSize: 12, color: "var(--text3)", marginTop: 2 } },
            `Since ${vm.startLabel} · ${vm.sessions} sessions`,
          ),
        ),
        React.createElement(
          "button",
          {
            "aria-label": "Close",
            onClick: onClose,
            style: {
              background: "var(--surface2)",
              border: "1px solid var(--line)",
              borderRadius: 9,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text2)",
              flexShrink: 0,
            },
          },
          React.createElement(
            "svg",
            {
              width: 15,
              height: 15,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.2",
              strokeLinecap: "round",
            },
            React.createElement("path", { d: "M18 6 6 18M6 6l12 12" }),
          ),
        ),
      ),
      // Stat tiles
      React.createElement(
        "div",
        { style: { display: "flex", gap: 10, marginTop: 18 } },
        statTile("PERSONAL BEST", vm.pr, "var(--accent)"),
        statTile("CURRENT", vm.current),
        statTile("ALL-TIME GAIN", vm.gainAll, "var(--accent2)"),
      ),
      // Chart
      React.createElement(
        "div",
        {
          style: {
            marginTop: 18,
            border: "1px solid var(--line)",
            borderRadius: 13,
            padding: "16px 12px 8px",
            background: "var(--surface2)",
          },
        },
        React.createElement(
          "svg",
          {
            viewBox: vm.viewBox,
            style: {
              width: "100%",
              height: "auto",
              display: "block",
              fontFamily: "'JetBrains Mono', monospace",
            },
          },
          ...gridLines,
          React.createElement("polygon", {
            points: vm.areaPoints,
            fill: "color-mix(in oklch, var(--accent) 12%, transparent)",
            stroke: "none",
          }),
          React.createElement("polyline", {
            points: vm.points,
            fill: "none",
            stroke: "var(--accent)",
            strokeWidth: 2.5,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }),
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 8px 2px",
              fontSize: 11,
              color: "var(--text3)",
              fontFamily: "'JetBrains Mono', monospace",
            },
          },
          React.createElement("span", null, vm.startLabel),
          React.createElement("span", null, vm.nowLabel),
        ),
      ),
    ),
  );
}

/**
 * Format a number for display: round to at most 1 decimal place,
 * dropping a trailing ".0" so integers show cleanly.
 * e.g. 71.0667 → "71.1", 88 → "88", 110.0 → "110"
 */
function fmt(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
}

/** Build the chart VM from a value series + labels. */
export function buildChartVM(
  _exercise: string,
  _series: number[],
  _unit: string,
  _startLabel: string,
): ChartVM {
  const W = 680;
  const H = 240;
  const pad = 30;
  const bottomY = H - pad; // 210

  const max = Math.max(..._series);
  const min = Math.min(..._series);
  const last = _series[_series.length - 1];
  const first = _series[0];

  // Sign-prefixed gain (display-rounded)
  const gainVal = last - first;
  let gainStr: string;
  if (gainVal > 0) {
    gainStr = `+${fmt(gainVal)} ${_unit}`;
  } else if (gainVal < 0) {
    gainStr = `${fmt(gainVal)} ${_unit}`;
  } else {
    gainStr = `0 ${_unit}`;
  }

  const points = trendPoints(_series, W, H, pad);

  // Area polygon: fixed bottom-left and bottom-right corners (integer coords)
  // plus the polyline points in between.
  const areaPoints = `${pad},${bottomY} ${points} ${W - pad},${bottomY}`;

  // gridY: [max, mid, min] mapped to SVG y
  const mid = (max + min) / 2;
  const span = max - min;
  const yRange = H - 2 * pad;

  const yForValue = (v: number): string => {
    const normY = span === 0 ? 0.5 : (v - min) / span;
    return (pad + (1 - normY) * yRange).toFixed(1);
  };

  const gridY = [
    { y: yForValue(max), label: fmt(max) },
    { y: yForValue(mid), label: fmt(mid) },
    { y: yForValue(min), label: fmt(min) },
  ];

  return {
    exercise: _exercise,
    startLabel: _startLabel,
    nowLabel: "Now",
    sessions: _series.length,
    pr: `${fmt(max)} ${_unit}`,
    current: `${fmt(last)} ${_unit}`,
    gainAll: gainStr,
    points,
    areaPoints,
    viewBox: `0 0 ${W} ${H}`,
    gridY,
  };
}
