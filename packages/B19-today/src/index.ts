// @nabd/today — the Today screen: hero next-set, rhythm list, coverage card,
// volume insight, stat tiles. Pure view-model builders + presentational React.

import React from "react";
import type { CSSProperties } from "react";
import type { Coverage, MuscleKey, Slot } from "@nabd/domain";
import { MUSCLE_NAMES } from "@nabd/domain";
import { recommendation } from "@nabd/coverage";
import type { MapStyle } from "@nabd/bodymap";
import { BodyMap, MuscleBar } from "@nabd/bodymap";

/** Three-value UI toggle for the body-map panel. */
export type CoverageView = "both" | "front" | "back";
import { Button, Segmented, Card } from "@nabd/design-system";

// ---------- view-model builders (pure) ----------

export interface LegendRow {
  muscle: MuscleKey;
  name: string;
  pct: number;
  rec: "rest" | "push" | "none";
}

const DEFAULT_LEGEND_MUSCLES: MuscleKey[] = [
  "chest",
  "lats",
  "side_delts",
  "biceps",
  "quads",
  "glutes",
  "abs",
  "calves",
];

/** Per-muscle legend rows for the given muscles (default: a fixed display set). */
export function buildLegend(coverage: Coverage, muscles?: MuscleKey[]): LegendRow[] {
  const set = muscles ?? DEFAULT_LEGEND_MUSCLES;
  return set.map((muscle) => {
    const pct = coverage[muscle];
    return {
      muscle,
      name: MUSCLE_NAMES[muscle],
      pct,
      rec: recommendation(pct),
    };
  });
}

export interface RhythmRow {
  id: string;
  timeStr: string;
  exercise: string;
  sub: string; // "<group> · <muscle names>"
  status: Slot["status"];
  badge: string; // result, "Now", "Skipped", or progress "1/3 sets"
  dotColor: string; // css var
  canStart: boolean;
  isNow: boolean;
}

export function buildRhythmRows(slots: Slot[]): RhythmRow[] {
  return slots.map((slot) => {
    const muscleNames = slot.muscles.map((m) => MUSCLE_NAMES[m]).join(", ");
    const sub = `${slot.group} · ${muscleNames}`;

    let badge: string;
    let dotColor: string;
    let canStart: boolean;
    let isNow: boolean;

    if (slot.status === "done") {
      badge = slot.result;
      dotColor = "var(--accent2)";
      canStart = false;
      isNow = false;
    } else if (slot.status === "now") {
      badge = "Now";
      dotColor = "var(--accent)";
      canStart = true;
      isNow = true;
    } else if (slot.status === "skipped") {
      badge = "Skipped";
      dotColor = "var(--text3)";
      canStart = false;
      isNow = false;
    } else {
      // upcoming
      if (slot.done > 0) {
        badge = `${slot.done}/${slot.sets} sets`;
      } else {
        badge = "—";
      }
      dotColor = "var(--text3)";
      canStart = true;
      isNow = false;
    }

    return {
      id: slot.id,
      timeStr: slot.timeStr,
      exercise: slot.exercise,
      sub,
      status: slot.status,
      badge,
      dotColor,
      canStart,
      isNow,
    };
  });
}

export interface HeroVM {
  allDone: boolean;
  kicker: string; // "UP NEXT · 10:20" / "LATER · …"
  exercise: string;
  group: string;
  muscleNames: string[];
  suggestion: string; // "3×19"
  note: string;
  setsTotal: number;
}

/** Hero from the current slot + its suggestion text (already computed by caller). */
export function buildHero(
  currentSlot: Slot | null,
  suggestion: string,
  note: string,
  setsTotal: number,
): HeroVM {
  if (currentSlot === null) {
    return {
      allDone: true,
      kicker: "",
      exercise: "",
      group: "",
      muscleNames: [],
      suggestion,
      note,
      setsTotal,
    };
  }

  const kicker =
    currentSlot.status === "now"
      ? `UP NEXT · ${currentSlot.timeStr}`
      : `LATER · ${currentSlot.timeStr}`;

  return {
    allDone: false,
    kicker,
    exercise: currentSlot.exercise,
    group: currentSlot.group,
    muscleNames: currentSlot.muscles.map((m) => MUSCLE_NAMES[m]),
    suggestion,
    note,
    setsTotal,
  };
}

// ---------- shared style constants ----------

const MONO: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

const CARD_STYLE: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 18,
  boxShadow: "var(--cardshadow)",
};

// ---------- components ----------

export interface HeroCardProps {
  vm: HeroVM;
  onStart: () => void;
  onSnooze: () => void;
}

export function HeroCard(p: HeroCardProps): JSX.Element {
  const { vm, onStart, onSnooze } = p;

  // allDone state
  if (vm.allDone) {
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
      // check circle
      React.createElement(
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
            strokeWidth: 3,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
          React.createElement("path", { d: "M20 6 9 17l-5-5" }),
        ),
      ),
      React.createElement(
        "div",
        { style: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" } },
        "Day complete",
      ),
      React.createElement(
        "div",
        { style: { fontSize: 13.5, color: "var(--text2)" } },
        `All ${vm.setsTotal} sets logged across your workday. Nice work.`,
      ),
    );
  }

  // normal hero
  return React.createElement(
    Card,
    {
      style: {
        ...CARD_STYLE,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      },
    },
    // kicker + group row
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
      React.createElement(
        "span",
        { style: { fontSize: 12, color: "var(--text3)" } },
        vm.group,
      ),
    ),
    // exercise name
    React.createElement(
      "div",
      {
        style: {
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
        },
      },
      vm.exercise,
    ),
    // muscle chips
    React.createElement(
      "div",
      { style: { display: "flex", gap: 7, flexWrap: "wrap" as const } },
      ...vm.muscleNames.map((name) =>
        React.createElement(
          "span",
          {
            key: name,
            style: {
              fontSize: 12,
              color: "var(--text2)",
              background: "var(--surface2)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: "5px 11px",
            },
          },
          name,
        ),
      ),
    ),
    // AI suggestion row
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 11,
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 11,
          padding: "12px 15px",
        },
      },
      // lightning icon box
      React.createElement(
        "div",
        {
          style: {
            width: 26,
            height: 26,
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
          { width: 15, height: 15, viewBox: "0 0 24 24", fill: "#fff" },
          React.createElement("path", { d: "M13 2 4 14h6l-1 8 9-12h-6z" }),
        ),
      ),
      // suggestion + note text — note is in its own span so getByText can find it
      React.createElement(
        "div",
        { style: { fontSize: 13.5, color: "var(--text2)", lineHeight: 1.45 } },
        "Suggested ",
        React.createElement(
          "b",
          { style: { color: "var(--text)", ...MONO } },
          vm.suggestion,
        ),
        " · ",
        React.createElement("span", null, vm.note),
      ),
    ),
    // buttons row
    React.createElement(
      "div",
      { style: { display: "flex", gap: 10 } },
      React.createElement(
        Button,
        {
          onClick: onStart,
          style: {
            flex: 1,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 11,
            padding: 14,
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
          },
        },
        "Start set",
      ),
      React.createElement(
        Button,
        {
          variant: "outline",
          onClick: onSnooze,
          style: {
            background: "transparent",
            color: "var(--text2)",
            border: "1px solid var(--line)",
            borderRadius: 11,
            padding: "14px 18px",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          },
        },
        "Snooze 5m",
      ),
    ),
  );
}

export interface RhythmCardProps {
  rows: RhythmRow[];
  doneCount: number;
  total: number;
  onStart: (slotId: string) => void;
}

export function RhythmCard(p: RhythmCardProps): JSX.Element {
  const { rows, doneCount, total, onStart } = p;

  return React.createElement(
    Card,
    {
      style: {
        ...CARD_STYLE,
        padding: 0,
        overflow: "hidden",
      },
    },
    // header
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 20px 14px",
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" } },
        "Today's rhythm",
      ),
      React.createElement(
        "div",
        { style: { ...MONO, fontSize: 11.5, color: "var(--text3)" } },
        `${doneCount} / ${total} done`,
      ),
    ),
    // rows
    ...rows.map((row) =>
      React.createElement(
        "div",
        {
          key: row.id,
          className: "nb-rrow",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 20px",
            borderTop: "1px solid var(--line)",
            transition: "background 0.12s ease",
          },
        },
        // time
        React.createElement(
          "span",
          {
            style: {
              ...MONO,
              fontSize: 12.5,
              color: "var(--text3)",
              width: 46,
              flexShrink: 0,
            },
          },
          row.timeStr,
        ),
        // status dot
        React.createElement("span", {
          style: {
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: row.dotColor,
            flexShrink: 0,
          },
        }),
        // exercise + sub
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontWeight: 600,
                fontSize: 14,
                color: row.isNow ? "var(--text)" : "var(--text2)",
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
        // badge
        React.createElement(
          "span",
          {
            style: {
              ...MONO,
              fontSize: 12,
              color: row.isNow ? "var(--accent)" : "var(--text3)",
              flexShrink: 0,
            },
          },
          row.badge,
        ),
        // start button (canStart only)
        row.canStart
          ? React.createElement(
              Button,
              {
                onClick: () => onStart(row.id),
                style: {
                  background: "transparent",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  flexShrink: 0,
                },
              },
              "Start",
            )
          : null,
      ),
    ),
  );
}

export interface CoverageCardProps {
  coverage: Coverage;
  mapView: CoverageView;
  mapStyle: MapStyle;
  onMapView: (v: CoverageView) => void;
  onMapStyle: (s: MapStyle) => void;
}

export function CoverageCard(p: CoverageCardProps): JSX.Element {
  const { coverage, mapView, mapStyle, onMapView, onMapStyle } = p;

  const legendRows = buildLegend(coverage);

  const viewOptions = [
    { k: "both", label: "Both" },
    { k: "front", label: "Front" },
    { k: "back", label: "Back" },
  ];

  const styleOptions = [
    { k: "heat", label: "Heat" },
    { k: "outline", label: "Outline" },
  ];

  const showFront = mapView !== "back";
  const showBack = mapView !== "front";

  return React.createElement(
    Card,
    {
      style: {
        ...CARD_STYLE,
        padding: "18px 18px 14px",
      },
    },
    // card title row
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" } },
        "Muscle coverage",
      ),
      React.createElement(
        "div",
        { style: { ...MONO, fontSize: 11, color: "var(--text3)" } },
        "7-DAY",
      ),
    ),
    // segmented controls row — Segmented renders its own surface2 container
    React.createElement(
      "div",
      { style: { display: "flex", gap: 6, marginBottom: 6 } },
      React.createElement(Segmented, {
        options: viewOptions,
        value: mapView,
        onChange: (v) => onMapView(v as CoverageView),
        small: true,
      }),
      React.createElement(Segmented, {
        options: styleOptions,
        value: mapStyle,
        onChange: (s) => onMapStyle(s as MapStyle),
        small: true,
      }),
    ),
    // body map(s)
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "center",
          gap: 14,
          padding: "10px 0 6px",
        },
      },
      showFront
        ? React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  ...MONO,
                  fontSize: 10.5,
                  color: "var(--text3)",
                  letterSpacing: "0.08em",
                },
              },
              "FRONT",
            ),
            React.createElement(BodyMap, { side: "front", coverage, style: mapStyle }),
          )
        : null,
      showBack
        ? React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  ...MONO,
                  fontSize: 10.5,
                  color: "var(--text3)",
                  letterSpacing: "0.08em",
                },
              },
              "BACK",
            ),
            React.createElement(BodyMap, { side: "back", coverage, style: mapStyle }),
          )
        : null,
    ),
    // muscle legend bars
    React.createElement(
      "div",
      {
        style: {
          borderTop: "1px solid var(--line)",
          paddingTop: 10,
          marginTop: 4,
        },
      },
      ...legendRows.map((row) =>
        React.createElement(MuscleBar, {
          key: row.muscle,
          muscle: row.muscle,
          pct: row.pct,
          showRec: true,
        }),
      ),
    ),
  );
}

export interface VolumeInsightProps {
  rest: string[]; // muscle display names
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

export interface StatTilesProps {
  streak: string;
  weekSets: string;
  volume: string;
}

export function StatTiles(p: StatTilesProps): JSX.Element {
  const { streak, weekSets, volume } = p;

  const tileStyle: CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 15,
    padding: 15,
    boxShadow: "var(--cardshadow)",
  };

  const numStyle: CSSProperties = {
    ...MONO,
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: "-0.02em",
  };

  const labelStyle: CSSProperties = {
    fontSize: 11,
    color: "var(--text3)",
    marginTop: 3,
  };

  return React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12,
      },
    },
    React.createElement(
      "div",
      { style: tileStyle },
      React.createElement("div", { style: numStyle }, streak),
      React.createElement("div", { style: labelStyle }, "day streak"),
    ),
    React.createElement(
      "div",
      { style: tileStyle },
      React.createElement("div", { style: numStyle }, weekSets),
      React.createElement("div", { style: labelStyle }, "sets / week"),
    ),
    React.createElement(
      "div",
      { style: tileStyle },
      React.createElement("div", { style: numStyle }, volume),
      React.createElement("div", { style: labelStyle }, "kg volume"),
    ),
  );
}

export interface TodayScreenProps {
  hero: HeroVM;
  rhythm: RhythmRow[];
  doneCount: number;
  total: number;
  coverage: Coverage;
  mapView: CoverageView;
  mapStyle: MapStyle;
  insightRest: string[];
  insightPush: string[];
  stats: StatTilesProps;
  onStartNext: () => void;
  onSnooze: () => void;
  onStartSlot: (slotId: string) => void;
  onMapView: (v: CoverageView) => void;
  onMapStyle: (s: MapStyle) => void;
}

/**
 * TodayScreen — two-column fluid grid layout.
 * Composes the exported HeroCard, RhythmCard, CoverageCard, VolumeInsightCard, StatTiles.
 */
export function TodayScreen(p: TodayScreenProps): JSX.Element {
  const {
    hero,
    rhythm,
    doneCount,
    total,
    coverage,
    mapView,
    mapStyle,
    insightRest,
    insightPush,
    stats,
    onStartNext,
    onSnooze,
    onStartSlot,
    onMapView,
    onMapStyle,
  } = p;

  return React.createElement(
    "div",
    {
      style: {
        flex: 1,
        overflow: "auto",
        padding: 26,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)",
          gap: 20,
          maxWidth: 1240,
          margin: "0 auto",
          alignItems: "start",
        },
      },
      // left column: hero + rhythm
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minWidth: 0,
          },
        },
        React.createElement(HeroCard, {
          vm: hero,
          onStart: onStartNext,
          onSnooze: onSnooze,
        }),
        React.createElement(RhythmCard, {
          rows: rhythm,
          doneCount,
          total,
          onStart: onStartSlot,
        }),
      ),
      // right column: coverage + insight + stats
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minWidth: 0,
          },
        },
        React.createElement(CoverageCard, {
          coverage,
          mapView,
          mapStyle,
          onMapView,
          onMapStyle,
        }),
        React.createElement(VolumeInsightCard, {
          rest: insightRest,
          push: insightPush,
        }),
        React.createElement(StatTiles, { ...stats }),
      ),
    ),
  );
}
