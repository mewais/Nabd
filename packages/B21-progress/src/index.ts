// @nabd/progress — the Progress screen: KPIs, consistency, completion, when and
// why sets get logged, muscle heatmap, and per-exercise progression.

import React from "react";
import type { Coverage } from "@nabd/domain";
import { Segmented } from "@nabd/design-system";
import { BodyMap } from "@nabd/bodymap";
import type {
  BarVM,
  CalendarCellVM,
  Kpi,
  ProgressionRowVM,
  ProgressVM,
  TriggerSeg,
} from "./view-model";

export { buildProgressVM } from "./view-model";
export type {
  ProgressVM,
  Kpi,
  CalendarCellVM,
  BarVM,
  TriggerSeg,
  ProgressionRowVM,
} from "./view-model";

// ---------- components ----------

// Calendar cell background by level
function cellBg(level: number): string {
  if (level === -1) return "transparent";
  if (level === 0) return "var(--surface2)";
  if (level === 1) return "color-mix(in oklch,var(--accent) 24%,var(--surface2))";
  if (level === 2) return "color-mix(in oklch,var(--accent) 50%,var(--surface2))";
  return "var(--accent)"; // level 3
}

// Calendar cell text color by level (only called for non-future cells, level >= 0)
function cellColor(level: number): string {
  if (level === 3) return "var(--surface)";
  if (level >= 1) return "var(--text2)";
  return "var(--text3)"; // level 0
}

// Weekday header labels S M T W T F S
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** The four headline numbers across the top of the screen. */
export function KpiStrip(p: { kpis: Kpi[] }): JSX.Element {
  const tiles = p.kpis.map((kpi, i) => {
    const valueEl = React.createElement(
      "span",
      {
        key: "v",
        className: "kpi-value",
        style: {
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: "-0.02em",
        },
      },
      kpi.value,
    );
    return React.createElement(
      "div",
      {
        key: i,
        className: "kpi-tile",
        style: {
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: 18,
          minWidth: 0,
        },
      },
      React.createElement(
        "div",
        {
          key: "label-top",
          className: "kpi-label",
          style: { fontSize: 11.5, color: "var(--text3)" },
        },
        kpi.label,
      ),
      React.createElement(
        "div",
        {
          key: "value-row",
          style: { display: "flex", alignItems: "baseline", gap: 5, marginTop: 8 },
        },
        valueEl,
        React.createElement(
          "span",
          {
            key: "u",
            className: "kpi-unit",
            style: { fontSize: 12, color: "var(--text3)" },
          },
          kpi.unit,
        ),
      ),
    );
  });

  return React.createElement(
    "div",
    {
      className: "kpi-strip",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        gap: 14,
      },
    },
    ...tiles,
  );
}

export interface ConsistencyCardProps {
  tab: "calendar" | "weekly";
  onTab: (t: "calendar" | "weekly") => void;
  calendar: { month: string; cells: CalendarCellVM[] };
  weekly: BarVM[];
}
export function ConsistencyCard(p: ConsistencyCardProps): JSX.Element {
  const { tab, onTab, calendar, weekly } = p;

  const segmented = React.createElement(Segmented, {
    options: [
      { k: "calendar", label: "Calendar" },
      { k: "weekly", label: "Weekly" },
    ],
    value: tab,
    onChange: (k: string) => onTab(k as "calendar" | "weekly"),
    small: true,
  });

  let content: JSX.Element;
  if (tab === "calendar") {
    // Weekday header row
    const weekdayHeaders = WEEKDAY_LABELS.map((w, i) =>
      React.createElement(
        "div",
        {
          key: `wh-${i}`,
          style: {
            textAlign: "center",
            fontSize: 9.5,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
          },
        },
        w,
      ),
    );

    // Calendar cells with level-based background and centered day number
    const cellEls = calendar.cells.map((cell) =>
      React.createElement(
        "div",
        {
          key: cell.day,
          className: `calendar-cell level-${cell.level}`,
          "data-day": cell.day,
          "data-level": cell.level,
          style: {
            height: 30,
            borderRadius: 7,
            background: cellBg(cell.level),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        cell.level !== -1
          ? React.createElement(
              "span",
              {
                style: {
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11,
                  color: cellColor(cell.level),
                  lineHeight: 1,
                  userSelect: "none",
                },
              },
              String(cell.day),
            )
          : null,
      ),
    );

    // Less → More legend
    const legend = React.createElement(
      "div",
      {
        key: "legend",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          fontSize: 11,
          color: "var(--text3)",
        },
      },
      React.createElement("span", { key: "less" }, "Less"),
      React.createElement("span", {
        key: "l0",
        style: {
          width: 13,
          height: 13,
          borderRadius: 4,
          background: "var(--surface2)",
          display: "inline-block",
        },
      }),
      React.createElement("span", {
        key: "l1",
        style: {
          width: 13,
          height: 13,
          borderRadius: 4,
          background: "color-mix(in oklch,var(--accent) 24%,var(--surface2))",
          display: "inline-block",
        },
      }),
      React.createElement("span", {
        key: "l2",
        style: {
          width: 13,
          height: 13,
          borderRadius: 4,
          background: "color-mix(in oklch,var(--accent) 50%,var(--surface2))",
          display: "inline-block",
        },
      }),
      React.createElement("span", {
        key: "l3",
        style: {
          width: 13,
          height: 13,
          borderRadius: 4,
          background: "var(--accent)",
          display: "inline-block",
        },
      }),
      React.createElement("span", { key: "more" }, "More"),
    );

    content = React.createElement(
      "div",
      { className: "calendar-view" },
      React.createElement(
        "div",
        {
          className: "calendar-month",
          style: {
            fontSize: 12,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
            marginBottom: 10,
          },
        },
        calendar.month,
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 6,
            marginBottom: 6,
          },
        },
        ...weekdayHeaders,
      ),
      React.createElement(
        "div",
        {
          className: "calendar-cells",
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 6,
          },
        },
        ...cellEls,
      ),
      legend,
    );
  } else {
    content = React.createElement(
      "div",
      { key: "weekly-content" },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 12,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
            marginBottom: 14,
          },
        },
        "Sets per week · last 8 weeks",
      ),
      React.createElement(
        "div",
        {
          className: "weekly-bars",
          style: {
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 160,
            gap: 8,
          },
        },
        ...weekly.map((bar, i) =>
          React.createElement(
            "div",
            {
              key: i,
              className: "weekly-bar",
              style: {
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                height: "100%",
                justifyContent: "flex-end",
              },
            },
            React.createElement(
              "span",
              {
                key: "val",
                style: {
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10,
                  color: "var(--text3)",
                },
              },
              bar.value > 0 ? String(bar.value) : "",
            ),
            React.createElement("div", {
              key: "fill",
              className: "bar-fill",
              style: {
                width: "100%",
                height: bar.heightPct > 0 ? `${bar.heightPct}%` : "2px",
                background: bar.current ? "var(--accent)" : "var(--surface2)",
                borderRadius: "4px 4px 0 0",
                minHeight: 2,
                transition: "height 0.3s",
              },
            }),
            React.createElement(
              "span",
              {
                key: "label",
                className: "bar-label",
                style: {
                  fontSize: 10,
                  color: "var(--text3)",
                  fontFamily: "'JetBrains Mono',monospace",
                },
              },
              bar.label,
            ),
          ),
        ),
      ),
    );
  }

  return React.createElement(
    "div",
    {
      className: "consistency-card",
      style: {
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--cardshadow,none)",
      },
    },
    React.createElement(
      "div",
      {
        key: "header",
        style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
      },
      React.createElement(
        "div",
        {
          key: "title",
          style: { fontSize: 15, fontWeight: 700 },
        },
        "Consistency",
      ),
      React.createElement("div", { key: "seg", style: { marginLeft: "auto" } }, segmented),
    ),
    content,
  );
}

export function CompletionCard(p: { weekPct: string; days: BarVM[] }): JSX.Element {
  const { weekPct, days } = p;
  return React.createElement(
    "div",
    {
      className: "completion-card",
      style: {
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--cardshadow,none)",
      },
    },
    React.createElement(
      "div",
      { key: "title", style: { fontSize: 15, fontWeight: 700 } },
      "Completion rate",
    ),
    React.createElement(
      "div",
      { key: "sub", style: { fontSize: 11.5, color: "var(--text3)", marginTop: 2 } },
      "Planned sets actually done",
    ),
    // Big percentage
    React.createElement(
      "div",
      {
        key: "pct-row",
        style: {
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          margin: "16px 0 4px",
        },
      },
      React.createElement(
        "span",
        {
          key: "pct",
          className: "week-pct",
          style: {
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--accent)",
          },
        },
        weekPct,
      ),
      React.createElement(
        "span",
        { key: "this-wk", style: { fontSize: 12, color: "var(--text3)" } },
        "this week",
      ),
    ),
    // Last 7 days section
    React.createElement(
      "div",
      { key: "last7", style: { marginTop: "auto" } },
      React.createElement(
        "div",
        {
          key: "lbl",
          style: {
            fontSize: 10,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: "0.06em",
            marginBottom: 10,
          },
        },
        "LAST 7 DAYS",
      ),
      React.createElement(
        "div",
        {
          className: "day-bars",
          style: {
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: 88,
            gap: 6,
          },
        },
        ...days.map((bar, i) =>
          React.createElement(
            "div",
            {
              key: i,
              className: "day-bar",
              style: {
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                height: "100%",
                justifyContent: "flex-end",
              },
            },
            React.createElement("div", {
              key: "fill",
              className: "bar-fill",
              style: {
                width: "100%",
                height: bar.heightPct > 0 ? `${bar.heightPct}%` : "3px",
                background: bar.current
                  ? "var(--accent)"
                  : "color-mix(in oklch,var(--accent2) 70%,var(--surface2))",
                borderRadius: "3px 3px 0 0",
                minHeight: 3,
                transition: "height 0.3s",
              },
            }),
            React.createElement(
              "span",
              {
                key: "label",
                className: "bar-label",
                style: { fontSize: 10, color: "var(--text3)" },
              },
              bar.label,
            ),
          ),
        ),
      ),
    ),
  );
}

export function TimeOfDayCard(p: { bars: BarVM[]; peakLabel: string }): JSX.Element {
  const { bars, peakLabel } = p;

  // Peak callout badge.
  const peakSection = React.createElement(
    "div",
    {
      className: "peak-section",
      style: {
        marginLeft: "auto",
        fontSize: 11,
        color: "var(--text2)",
        background: "var(--surface2)",
        border: "1px solid var(--line)",
        borderRadius: 7,
        padding: "4px 9px",
        display: "flex",
        alignItems: "center",
        gap: 4,
      },
    },
    React.createElement("span", { className: "peak-word" }, "Peak"),
    React.createElement(
      "b",
      { style: { fontFamily: "'JetBrains Mono',monospace" } },
      React.createElement("span", { className: "peak-label" }, peakLabel),
    ),
  );

  // Histogram bars — render label for all bars; peak label also appears in badge
  const barsEl = React.createElement(
    "div",
    {
      className: "tod-bars",
      style: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: 124,
        gap: 5,
        marginTop: 18,
      },
    },
    ...bars.map((bar, i) => {
      const isCurrentPeak = bar.label === peakLabel;
      return React.createElement(
        "div",
        {
          key: i,
          className: "tod-bar",
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            height: "100%",
            justifyContent: "flex-end",
          },
        },
        React.createElement("div", {
          key: "fill",
          className: "bar-fill",
          style: {
            width: "100%",
            height: bar.heightPct > 0 ? `${bar.heightPct}%` : "3px",
            background: isCurrentPeak
              ? "var(--accent)"
              : "color-mix(in oklch,var(--accent) 30%,var(--surface2))",
            borderRadius: "3px 3px 0 0",
            minHeight: 3,
            transition: "height 0.3s",
          },
        }),
        // Only render bar label for non-peak bars to keep peakLabel unique in DOM.
        isCurrentPeak
          ? null
          : React.createElement(
              "span",
              {
                key: "label",
                className: "bar-label",
                style: {
                  fontSize: 9,
                  color: "var(--text3)",
                  fontFamily: "'JetBrains Mono',monospace",
                },
              },
              bar.label,
            ),
      );
    }),
  );

  return React.createElement(
    "div",
    {
      className: "time-of-day-card",
      style: {
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "var(--cardshadow,none)",
      },
    },
    // Header row with title + peak badge
    React.createElement(
      "div",
      {
        key: "header",
        style: { display: "flex", alignItems: "center", gap: 10 },
      },
      React.createElement(
        "div",
        { key: "title", style: { fontSize: 15, fontWeight: 700 } },
        "Time of day",
      ),
      peakSection,
    ),
    React.createElement(
      "div",
      {
        key: "sub",
        style: { fontSize: 11.5, color: "var(--text3)", marginTop: 3 },
      },
      "When you fit sets into the workday",
    ),
    barsEl,
  );
}

export function TriggerCard(p: { segments: TriggerSeg[] }): JSX.Element {
  const { segments } = p;
  return React.createElement(
    "div",
    {
      className: "trigger-card",
      style: {
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--cardshadow,none)",
      },
    },
    React.createElement(
      "div",
      { key: "title", style: { fontSize: 15, fontWeight: 700 } },
      "What prompts a set",
    ),
    React.createElement(
      "div",
      { key: "sub", style: { fontSize: 11.5, color: "var(--text3)", marginTop: 3 } },
      "Idle detection vs timer vs manual",
    ),
    // Split bar
    React.createElement(
      "div",
      {
        key: "bar",
        className: "trigger-bar",
        style: {
          display: "flex",
          height: 34,
          borderRadius: 7,
          overflow: "hidden",
          margin: "18px 0",
          gap: 2,
        },
      },
      ...segments.map((seg, i) =>
        React.createElement("div", {
          key: i,
          className: "trigger-seg",
          style: {
            width: `${seg.pct}%`,
            background: seg.color,
            minWidth: seg.pct > 0 ? 2 : 0,
          },
        }),
      ),
    ),
    // Legend
    React.createElement(
      "div",
      {
        key: "legend",
        className: "trigger-legend",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 11,
          marginTop: "auto",
        },
      },
      ...segments.map((seg, i) =>
        React.createElement(
          "div",
          {
            key: i,
            className: "legend-item",
            style: { display: "flex", alignItems: "center", gap: 10 },
          },
          React.createElement("div", {
            key: "dot",
            className: "legend-dot",
            style: {
              background: seg.color,
              width: 11,
              height: 11,
              borderRadius: 3,
              flexShrink: 0,
            },
          }),
          React.createElement(
            "span",
            { key: "label", style: { fontSize: 13, flex: 1 } },
            seg.label,
          ),
          React.createElement(
            "span",
            {
              key: "pct",
              style: {
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 13,
                fontWeight: 600,
              },
            },
            `${seg.pct}%`,
          ),
        ),
      ),
    ),
  );
}

export function MuscleHeatmapCard(p: { coverage: Coverage }): JSX.Element {
  return React.createElement(
    "div",
    {
      className: "muscle-heatmap-card",
      style: {
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        gap: 26,
        alignItems: "center",
        flexWrap: "wrap",
        boxShadow: "var(--cardshadow,none)",
      },
    },
    React.createElement(
      "div",
      { key: "header-section" },
      React.createElement(
        "div",
        { key: "title", style: { fontSize: 15, fontWeight: 700, marginBottom: 2 } },
        "Sets per muscle",
      ),
      React.createElement(
        "div",
        { key: "sub", style: { fontSize: 11.5, color: "var(--text3)", marginBottom: 10 } },
        "7-day coverage",
      ),
      React.createElement(
        "div",
        { key: "maps", style: { display: "flex", gap: 14 } },
        React.createElement(
          "div",
          {
            key: "front-wrap",
            style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
          },
          React.createElement(
            "div",
            {
              key: "front-lbl",
              style: {
                fontSize: 10.5,
                color: "var(--text3)",
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.08em",
              },
            },
            "FRONT",
          ),
          React.createElement(BodyMap, { key: "front", side: "front", coverage: p.coverage }),
        ),
        React.createElement(
          "div",
          {
            key: "back-wrap",
            style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
          },
          React.createElement(
            "div",
            {
              key: "back-lbl",
              style: {
                fontSize: 10.5,
                color: "var(--text3)",
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: "0.08em",
              },
            },
            "BACK",
          ),
          React.createElement(BodyMap, { key: "back", side: "back", coverage: p.coverage }),
        ),
      ),
    ),
  );
}

export interface ProgressionCardProps {
  rows: ProgressionRowVM[];
  onOpenChart: (exId: string) => void;
}
export function ProgressionCard(p: ProgressionCardProps): JSX.Element {
  const { rows, onOpenChart } = p;

  // Trophy icon SVG path (from design handoff)
  const trophyPath =
    "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z";

  // Chevron right SVG path
  const chevronPath = "M9 18l6-6-6-6";

  // Table column template: EXERCISE | LAST 30 DAYS | BEST | GAIN | chevron
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "1.3fr 1.5fr 84px 78px 16px",
    gap: 14,
  };

  return React.createElement(
    "div",
    {
      className: "progression-card",
      style: {
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "var(--cardshadow,none)",
      },
    },
    // Header
    React.createElement(
      "div",
      {
        key: "header",
        style: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 },
      },
      React.createElement(
        "div",
        { key: "title", style: { fontSize: 15, fontWeight: 700 } },
        "Progression & records",
      ),
      React.createElement(
        "span",
        { key: "sub", style: { fontSize: 11.5, color: "var(--text3)" } },
        "Trend & personal best · click a row for full history",
      ),
    ),
    // Column headers
    React.createElement(
      "div",
      {
        key: "col-headers",
        style: {
          ...gridStyle,
          padding: "10px 2px 8px",
          fontSize: 9.5,
          fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: "0.06em",
          color: "var(--text3)",
          borderBottom: "1px solid var(--line)",
        },
      },
      React.createElement("span", { key: "c1" }, "EXERCISE"),
      React.createElement("span", { key: "c2" }, "LAST 30 DAYS"),
      React.createElement("span", { key: "c3", style: { textAlign: "right" } }, "BEST"),
      React.createElement("span", { key: "c4", style: { textAlign: "right" } }, "GAIN"),
      React.createElement("span", { key: "c5" }),
    ),
    // Rows
    ...rows.map((row) =>
      React.createElement(
        "div",
        {
          key: row.exId,
          className: "progression-row",
          onClick: () => onOpenChart(row.exId),
          style: {
            ...gridStyle,
            alignItems: "center",
            padding: "13px 6px",
            margin: "0 -4px",
            borderTop: "1px solid var(--line)",
            borderRadius: 9,
            cursor: "pointer",
          },
        },
        // Exercise name
        React.createElement(
          "span",
          {
            key: "name",
            className: "ex-name",
            style: { fontSize: 13.5, fontWeight: 600 },
          },
          row.exercise,
        ),
        // Sparkline SVG
        React.createElement(
          "svg",
          {
            key: "svg",
            viewBox: "0 0 120 34",
            preserveAspectRatio: "none",
            style: { width: "100%", height: 34, overflow: "visible" },
          },
          React.createElement("polyline", {
            points: row.points,
            fill: "none",
            stroke: "var(--accent)",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            vectorEffect: "non-scaling-stroke",
          }),
        ),
        // PR with trophy icon
        React.createElement(
          "span",
          {
            key: "pr",
            className: "pr-value",
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 5,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 12.5,
              fontWeight: 600,
            },
          },
          React.createElement(
            "svg",
            {
              key: "trophy",
              width: 12,
              height: 12,
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "var(--accent)",
              strokeWidth: 2,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            },
            React.createElement("path", { d: trophyPath }),
          ),
          row.pr,
        ),
        // Gain badge
        React.createElement(
          "span",
          {
            key: "gain",
            className: "gain-badge",
            style: {
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11.5,
              fontWeight: 600,
              color: row.up ? "var(--accent2)" : "var(--text3)",
              background: row.up
                ? "color-mix(in oklch,var(--accent2) 12%,transparent)"
                : "color-mix(in oklch,var(--text3) 12%,transparent)",
              borderRadius: 6,
              padding: "4px 8px",
              textAlign: "center",
            },
          },
          row.gainStr,
        ),
        // Chevron arrow
        React.createElement(
          "svg",
          {
            key: "chevron",
            width: 14,
            height: 14,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "var(--text3)",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          },
          React.createElement("path", { d: chevronPath }),
        ),
      ),
    ),
  );
}

export interface ProgressScreenProps {
  vm: ProgressVM;
  coverage: Coverage;
  tab: "calendar" | "weekly";
  onTab: (t: "calendar" | "weekly") => void;
  /** Open the full-history chart for an exercise. */
  onOpenChart: (exId: string) => void;
}

export function ProgressScreen(p: ProgressScreenProps): JSX.Element {
  const { vm, coverage, tab, onTab, onOpenChart } = p;
  const { kpis, calendar, weekly, completion, triggers: segments } = vm;
  const timeOfDayData = vm.timeOfDay;
  const progressionRows = vm.progression;

  return React.createElement(
    "div",
    {
      className: "progress-screen",
      style: {
        maxWidth: 1100,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        overflowX: "hidden",
      },
    },
    // Page title
    React.createElement(
      "div",
      {
        key: "page-title",
        style: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" },
      },
      "Progress",
    ),
    // KPI strip
    React.createElement(KpiStrip, { key: "kpis", kpis }),
    // Consistency + Completion (two-up, collapses on narrow)
    React.createElement(
      "div",
      {
        key: "row-consistency",
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)",
          gap: 16,
          alignItems: "stretch",
        },
      },
      React.createElement(ConsistencyCard, { key: "consistency", tab, onTab, calendar, weekly }),
      React.createElement(CompletionCard, {
        key: "completion",
        weekPct: completion.weekPct,
        days: completion.days,
      }),
    ),
    // Time of day + Trigger (two-up, collapses on narrow)
    React.createElement(
      "div",
      {
        key: "row-tod",
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 16,
          alignItems: "stretch",
        },
      },
      React.createElement(TimeOfDayCard, {
        key: "tod",
        bars: timeOfDayData.bars,
        peakLabel: timeOfDayData.peakLabel,
      }),
      React.createElement(TriggerCard, { key: "trigger", segments }),
    ),
    // Muscle heatmap
    React.createElement(MuscleHeatmapCard, { key: "heatmap", coverage }),
    // Progression rows
    React.createElement(ProgressionCard, {
      key: "progression",
      rows: progressionRows,
      onOpenChart,
    }),
  );
}
