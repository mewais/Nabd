import React from "react";
import { Card } from "@nabd/design-system";
import { CARD_STYLE, MONO } from "./styles";

export interface VolumeInsightProps {
  /** Display names of well-trained muscles. */
  rest: string[];
  /** Display names of lagging muscles the plan targets. */
  push: string[];
}

export function VolumeInsightCard(p: VolumeInsightProps): JSX.Element {
  const { rest, push } = p;

  return React.createElement(
    Card,
    {
      style: {
        ...CARD_STYLE,
        padding: 18,
      },
    },
    // title + AI badge
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" } },
        "Volume insight",
      ),
      React.createElement(
        "span",
        {
          style: {
            ...MONO,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent)",
            background: "var(--surface2)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "3px 7px",
          },
        },
        "AI",
      ),
    ),
    // insight rows
    React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 11 } },
      rest.length + push.length === 0
        ? React.createElement(
            "div",
            { style: { fontSize: 13, lineHeight: 1.5, color: "var(--text3)" } },
            "Nothing stands out yet — log a few sets and this fills in.",
          )
        : null,
      rest.length > 0
        ? React.createElement(
            "div",
            { style: { display: "flex", gap: 11, alignItems: "flex-start" } },
            React.createElement("span", {
              style: {
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--accent3)",
                flexShrink: 0,
                marginTop: 4,
              },
            }),
            React.createElement(
              "div",
              { style: { fontSize: 13, lineHeight: 1.5 } },
              React.createElement("b", null, "Rest these"),
              ` — ${rest.join(", ")} are well-trained this week.`,
            ),
          )
        : null,
      push.length > 0
        ? React.createElement(
            "div",
            { style: { display: "flex", gap: 11, alignItems: "flex-start" } },
            React.createElement("span", {
              style: {
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--accent)",
                flexShrink: 0,
                marginTop: 4,
              },
            }),
            React.createElement(
              "div",
              { style: { fontSize: 13, lineHeight: 1.5 } },
              React.createElement("b", null, "Push these"),
              ` — ${push.join(", ")} are lagging. Good to prioritize.`,
            ),
          )
        : null,
    ),
  );
}
