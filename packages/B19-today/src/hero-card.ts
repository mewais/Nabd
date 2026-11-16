import React from "react";
import type { CSSProperties, ReactNode } from "react";
import { plural } from "@nabd/domain";
import { AdviceCard, Button, Card } from "@nabd/design-system";
import { CARD_STYLE, MONO } from "./styles";
import type { HeroVM } from "./view-model";

const PRIMARY_BUTTON: CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 11,
  padding: "14px 22px",
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};

const OUTLINE_BUTTON: CSSProperties = {
  background: "transparent",
  color: "var(--text2)",
  border: "1px solid var(--line)",
  borderRadius: 11,
  padding: "14px 18px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
};

const CHIP: CSSProperties = {
  fontSize: 12,
  color: "var(--text2)",
  background: "var(--surface2)",
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "5px 11px",
};

/** A centred message card: a round badge, a title and a line of explanation. */
function Announcement(p: { badge: ReactNode; title: string; text: string }): JSX.Element {
  return React.createElement(
    Card,
    {
      style: {
        ...CARD_STYLE,
        padding: "34px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        textAlign: "center",
      },
    },
    p.badge,
    React.createElement(
      "div",
      { style: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" } },
      p.title,
    ),
    React.createElement("div", { style: { fontSize: 13.5, color: "var(--text2)" } }, p.text),
  );
}

const CHECK_BADGE = React.createElement(
  "div",
  {
    style: {
      width: 54,
      height: 54,
      borderRadius: "50%",
      background: "var(--accent2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  React.createElement(
    "svg",
    {
      width: 28,
      height: 28,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#fff",
      strokeWidth: 2.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    React.createElement("path", { d: "M20 6 9 17l-5-5" }),
  ),
);

export interface HeroCardProps {
  vm: HeroVM;
  onStart: () => void;
  onSnooze: () => void;
  /** Log an exercise that is not in today's plan. */
  onLogOther: () => void;
}

/** The headline card: what to do next, or why there is nothing to do. */
export function HeroCard(p: HeroCardProps): JSX.Element {
  const { vm, onStart, onSnooze, onLogOther } = p;

  if (vm.kind === "complete") {
    return React.createElement(Announcement, {
      badge: CHECK_BADGE,
      title: "Day complete",
      text: `All ${plural(vm.setsDone, "set")} logged across your workday. Nice work.`,
    });
  }
  if (vm.kind === "rest") {
    return React.createElement(Announcement, {
      badge: null,
      title: vm.hasProgram ? "Rest day" : "No plan yet",
      text: vm.hasProgram
        ? "Nothing is planned for today. You can still log a set of anything."
        : "Build your week on the Plan screen and today's sets will show up here.",
    });
  }

  return React.createElement(
    Card,
    { style: { ...CARD_STYLE, padding: 24, display: "flex", flexDirection: "column", gap: 16 } },
    React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      React.createElement(
        "span",
        {
          style: {
            ...MONO,
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--accent)",
          },
        },
        vm.kicker,
      ),
      React.createElement("span", { style: { fontSize: 12, color: "var(--text3)" } }, vm.label),
    ),
    React.createElement(
      "div",
      { style: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 } },
      vm.exercise,
    ),
    vm.target !== null
      ? React.createElement(
          "div",
          { style: { ...MONO, fontSize: 13, color: "var(--text2)" } },
          vm.target,
        )
      : null,
    React.createElement(
      "div",
      { style: { display: "flex", gap: 7, flexWrap: "wrap" } },
      ...vm.muscleNames.map((name) =>
        React.createElement("span", { key: name, style: CHIP }, name),
      ),
    ),
    vm.notes !== ""
      ? React.createElement(
          "div",
          { style: { fontSize: 12.5, color: "var(--text3)", fontStyle: "italic" } },
          vm.notes,
        )
      : null,
    vm.advice !== null ? React.createElement(AdviceCard, { advice: vm.advice }) : null,
    React.createElement(
      "div",
      { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
      React.createElement(Button, { onClick: onStart, style: PRIMARY_BUTTON }, "Start set"),
      vm.due
        ? React.createElement(Button, { onClick: onSnooze, style: OUTLINE_BUTTON }, "Snooze 5m")
        : null,
      React.createElement(
        Button,
        { onClick: onLogOther, style: OUTLINE_BUTTON },
        "Log something else",
      ),
      React.createElement(
        "span",
        { style: { fontSize: 12, color: vm.due ? "var(--accent)" : "var(--text3)" } },
        vm.nudgeLine,
      ),
    ),
  );
}
