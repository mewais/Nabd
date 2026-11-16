import React from "react";
import type { CSSProperties } from "react";
import { Button, Card } from "@nabd/design-system";
import { CARD_STYLE, MONO, SECTION_TITLE } from "./styles";
import type { QueueRowVM } from "./view-model";

const DOT_COLOR: Record<QueueRowVM["state"], string> = {
  next: "var(--accent)",
  pending: "var(--text3)",
  done: "var(--accent2)",
  skipped: "var(--line)",
};

const ROW_BUTTON: CSSProperties = {
  background: "transparent",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  flexShrink: 0,
};

export interface QueueCardProps {
  dayName: string | null;
  rows: QueueRowVM[];
  onStart: (itemId: string) => void;
  onToggleSkip: (itemId: string) => void;
}

/** Today's exercises in order. Any of them can be started, whatever the order. */
export function QueueCard(p: QueueCardProps): JSX.Element {
  const { dayName, rows, onStart, onToggleSkip } = p;

  return React.createElement(
    Card,
    { style: { ...CARD_STYLE, padding: 0, overflow: "hidden" } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "18px 20px 14px",
        },
      },
      React.createElement("div", { style: SECTION_TITLE }, "Today's rhythm"),
      dayName !== null
        ? React.createElement("div", { style: { fontSize: 12, color: "var(--text3)" } }, dayName)
        : null,
    ),
    ...rows.map((row, index) =>
      React.createElement(
        "div",
        {
          key: row.id,
          "data-state": row.state,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 20px",
            borderTop: "1px solid var(--line)",
            transition: "background 0.12s ease",
            opacity: row.state === "skipped" ? 0.55 : 1,
          },
        },
        React.createElement(
          "span",
          { style: { ...MONO, fontSize: 12.5, color: "var(--text3)", width: 26, flexShrink: 0 } },
          row.supersetTag ?? String(index + 1).padStart(2, "0"),
        ),
        React.createElement("span", {
          style: {
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: DOT_COLOR[row.state],
            flexShrink: 0,
          },
        }),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontWeight: 600,
                fontSize: 14,
                color: row.state === "next" ? "var(--text)" : "var(--text2)",
              },
            },
            row.exercise,
          ),
          React.createElement(
            "div",
            { style: { fontSize: 11.5, color: "var(--text3)", marginTop: 1 } },
            row.sub,
          ),
        ),
        React.createElement(
          "span",
          {
            style: {
              ...MONO,
              fontSize: 12,
              color:
                row.state === "next"
                  ? "var(--accent)"
                  : row.state === "done"
                    ? "var(--accent2)"
                    : "var(--text3)",
              flexShrink: 0,
            },
          },
          row.badge,
        ),
        row.skipLabel !== null
          ? React.createElement(
              Button,
              {
                onClick: () => onToggleSkip(row.id),
                style: { ...ROW_BUTTON, color: "var(--text3)", border: "1px solid var(--line)" },
              },
              row.skipLabel,
            )
          : null,
        row.state !== "skipped"
          ? React.createElement(
              Button,
              {
                onClick: () => onStart(row.id),
                style: { ...ROW_BUTTON, color: "var(--accent)", border: "1px solid var(--accent)" },
              },
              row.state === "done" ? "More" : "Start",
            )
          : null,
      ),
    ),
  );
}
