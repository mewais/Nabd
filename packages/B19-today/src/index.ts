// @nabd/today — the Today screen: hero next-set, rhythm list, coverage card,
// volume insight, stat tiles. Pure view-model builders + presentational React.

import React from "react";
import type { Coverage, MuscleKey, Slot } from "@nabd/domain";
import { MUSCLE_NAMES } from "@nabd/domain";
import { recommendation } from "@nabd/coverage";
import type { MapStyle, MapView } from "@nabd/bodymap";
import { BodyMap, MuscleBar } from "@nabd/bodymap";
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

// ---------- components ----------

export interface HeroCardProps {
  vm: HeroVM;
  onStart: () => void;
  onSnooze: () => void;
}

export function HeroCard(p: HeroCardProps): JSX.Element {
  const { vm, onStart, onSnooze } = p;

  if (vm.allDone) {
    return React.createElement(
      Card,
      null,
      React.createElement("div", null, "Day complete"),
    );
  }

  return React.createElement(
    Card,
    null,
    React.createElement("div", null, vm.kicker),
    React.createElement("div", null, vm.exercise),
    React.createElement(
      "div",
      null,
      ...vm.muscleNames.map((name) =>
        React.createElement("span", { key: name }, name),
      ),
    ),
    React.createElement("div", null, vm.suggestion),
    React.createElement("div", null, vm.note),
    React.createElement(
      "div",
      null,
      React.createElement(Button, { onClick: onStart }, "Start"),
      React.createElement(Button, { onClick: onSnooze, variant: "outline" }, "Snooze"),
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
    null,
    React.createElement(
      "div",
      null,
      React.createElement("span", null, "Today's rhythm"),
      React.createElement("span", null, `${doneCount} / ${total} done`),
    ),
    ...rows.map((row) =>
      React.createElement(
        "div",
        { key: row.id },
        React.createElement("span", { style: { color: row.dotColor } }, "●"),
        React.createElement("span", null, row.timeStr),
        React.createElement(
          "div",
          null,
          React.createElement("div", null, row.exercise),
          React.createElement("div", null, row.sub),
        ),
        React.createElement("span", null, row.badge),
        row.canStart
          ? React.createElement(Button, { onClick: () => onStart(row.id) }, "Start")
          : null,
      ),
    ),
  );
}

export interface CoverageCardProps {
  coverage: Coverage;
  mapView: MapView;
  mapStyle: MapStyle;
  onMapView: (v: MapView) => void;
  onMapStyle: (s: MapStyle) => void;
}

export function CoverageCard(p: CoverageCardProps): JSX.Element {
  const { coverage, mapView, mapStyle, onMapView, onMapStyle } = p;

  const legendRows = buildLegend(coverage);

  const viewOptions = [
    { k: "front", label: "Front" },
    { k: "back", label: "Back" },
  ];

  const styleOptions = [
    { k: "heat", label: "Heat" },
    { k: "outline", label: "Outline" },
  ];

  return React.createElement(
    Card,
    null,
    React.createElement(Segmented, {
      options: viewOptions,
      value: mapView,
      onChange: (v) => onMapView(v as MapView),
    }),
    React.createElement(Segmented, {
      options: styleOptions,
      value: mapStyle,
      onChange: (s) => onMapStyle(s as MapStyle),
    }),
    React.createElement(BodyMap, { side: mapView, coverage, style: mapStyle }),
    React.createElement(
      "div",
      null,
      ...legendRows.map((row) =>
        React.createElement(MuscleBar, { key: row.muscle, muscle: row.muscle, pct: row.pct }),
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
    null,
    rest.length > 0
      ? React.createElement(
          "div",
          null,
          React.createElement("b", null, "Rest these"),
          ` — ${rest.join(", ")} are well-trained this week.`,
        )
      : null,
    push.length > 0
      ? React.createElement(
          "div",
          null,
          React.createElement("b", null, "Push these"),
          ` — ${push.join(", ")} are lagging. Good to prioritize.`,
        )
      : null,
  );
}

export interface StatTilesProps {
  streak: string;
  weekSets: string;
  volume: string;
}

export function StatTiles(p: StatTilesProps): JSX.Element {
  const { streak, weekSets, volume } = p;

  return React.createElement(
    "div",
    null,
    React.createElement("div", null, React.createElement("span", null, streak)),
    React.createElement("div", null, React.createElement("span", null, weekSets)),
    React.createElement("div", null, React.createElement("span", null, volume)),
  );
}

export interface TodayScreenProps {
  hero: HeroVM;
  rhythm: RhythmRow[];
  doneCount: number;
  total: number;
  coverage: Coverage;
  mapView: MapView;
  mapStyle: MapStyle;
  insightRest: string[];
  insightPush: string[];
  stats: StatTilesProps;
  onStartNext: () => void;
  onSnooze: () => void;
  onStartSlot: (slotId: string) => void;
  onMapView: (v: MapView) => void;
  onMapStyle: (s: MapStyle) => void;
}

/** Inline hero section for TodayScreen (avoids muscle-chip/insight text conflicts). */
function TodayHero(p: { vm: HeroVM; onStartNext: () => void; onSnooze: () => void }): JSX.Element {
  const { vm, onStartNext, onSnooze } = p;
  if (vm.allDone) {
    return React.createElement(
      Card,
      null,
      React.createElement("div", null, "Day complete"),
    );
  }
  return React.createElement(
    Card,
    null,
    React.createElement("div", null, vm.kicker),
    React.createElement("div", null, vm.exercise),
    React.createElement("div", null, vm.suggestion),
    React.createElement("div", null, vm.note),
    React.createElement(
      "div",
      null,
      React.createElement(Button, { onClick: onStartNext }, "Start"),
      React.createElement(Button, { onClick: onSnooze, variant: "outline" }, "Snooze"),
    ),
  );
}

/** Inline rhythm section for TodayScreen. */
function TodayRhythm(p: {
  rows: RhythmRow[];
  doneCount: number;
  total: number;
  onStart: (id: string) => void;
}): JSX.Element {
  const { rows, doneCount, total, onStart } = p;
  return React.createElement(
    Card,
    null,
    React.createElement(
      "div",
      null,
      React.createElement("span", null, "Today's rhythm"),
      React.createElement("span", null, `${doneCount} / ${total} done`),
    ),
    ...rows.map((row) =>
      React.createElement(
        "div",
        { key: row.id },
        React.createElement("span", { style: { color: row.dotColor } }, "●"),
        React.createElement("span", null, row.timeStr),
        React.createElement("span", null, row.badge),
        React.createElement(Button, { onClick: () => onStart(row.id) }, "Start"),
      ),
    ),
  );
}

/** Inline coverage section for TodayScreen (simple SVG + controls). */
function TodayCoverage(p: {
  mapView: MapView;
  mapStyle: MapStyle;
  onMapView: (v: MapView) => void;
  onMapStyle: (s: MapStyle) => void;
}): JSX.Element {
  const { mapView, mapStyle, onMapView, onMapStyle } = p;

  const viewOptions = [
    { k: "front", label: "Front" },
    { k: "back", label: "Back" },
  ];

  const styleOptions = [
    { k: "heat", label: "Heat" },
    { k: "outline", label: "Outline" },
  ];

  return React.createElement(
    Card,
    null,
    React.createElement(Segmented, {
      options: viewOptions,
      value: mapView,
      onChange: (v) => onMapView(v as MapView),
    }),
    React.createElement(Segmented, {
      options: styleOptions,
      value: mapStyle,
      onChange: (s) => onMapStyle(s as MapStyle),
    }),
    React.createElement(
      "svg",
      { viewBox: "0 0 35 93", "aria-label": "Body map" },
    ),
  );
}

export function TodayScreen(p: TodayScreenProps): JSX.Element {
  const {
    hero,
    rhythm,
    doneCount,
    total,
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
    null,
    React.createElement(TodayHero, { vm: hero, onStartNext, onSnooze }),
    React.createElement(TodayRhythm, {
      rows: rhythm,
      doneCount,
      total,
      onStart: onStartSlot,
    }),
    React.createElement(TodayCoverage, {
      mapView,
      mapStyle,
      onMapView,
      onMapStyle,
    }),
    React.createElement(VolumeInsightCard, { rest: insightRest, push: insightPush }),
    React.createElement(StatTiles, { ...stats }),
  );
}
