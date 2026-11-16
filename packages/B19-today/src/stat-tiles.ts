import React from "react";
import type { CSSProperties } from "react";
import { MONO } from "./styles";
import type { TodayVM } from "./view-model";

const TILE: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 15,
  padding: 15,
  boxShadow: "var(--cardshadow)",
};

const NUMBER: CSSProperties = { ...MONO, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" };
const LABEL: CSSProperties = { fontSize: 11, color: "var(--text3)", marginTop: 3 };

export function StatTiles(p: TodayVM["stats"]): JSX.Element {
  const tiles: [number, string][] = [
    [p.streak, "day streak"],
    [p.weekSets, "sets this week"],
    [p.volume, `${p.unit} lifted today`],
  ];
  return React.createElement(
    "div",
    { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
    ...tiles.map(([value, label]) =>
      React.createElement(
        "div",
        { key: label, style: TILE },
        React.createElement("div", { style: NUMBER }, value.toLocaleString()),
        React.createElement("div", { style: LABEL }, label),
      ),
    ),
  );
}
