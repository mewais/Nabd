import React from "react";

export interface ToastProps {
  /** "Interval's up" / "You've gone quiet" */
  reasonLabel: string;
  exercise: string;
  /** A line of context under the exercise name. */
  sub: string;
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
