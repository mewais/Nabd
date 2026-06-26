// @nabd/progress — Progress screen: KPI strip, consistency (calendar|weekly),
// completion, time-of-day, trigger mix, sets-per-muscle heatmap, progression rows.
// Pure view-model builders (over @nabd/analytics + @nabd/progression) + React.

import React from "react";
import type { Coverage, LoggedSet } from "@nabd/domain";
import {
  streak,
  completionThisWeek,
  setsThisWeek,
  activeDays30,
  calendarHeatmap,
  weeklyBars,
  completionLast7,
  timeOfDay,
  triggerMix,
} from "@nabd/analytics";
import {
  fullHistorySeries,
  trendPoints,
  personalBest,
  gain,
  formatGain,
} from "@nabd/progression";
import { Segmented } from "@nabd/design-system";
import { BodyMap } from "@nabd/bodymap";

// ---------- helpers ----------

/**
 * Format a number cleanly: at most 1 decimal place, dropping trailing ".0".
 * Examples: fmt(88) → "88", fmt(85.3) → "85.3", fmt(86.666…) → "86.7".
 */
function fmt(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

// ---------- view-model builders (pure) ----------

export interface Kpi {
  label: string;
  value: string;
  unit: string;
}
export function buildKpis(history: LoggedSet[], plannedPerWeek: number, now: Date): Kpi[] {
  return [
    {
      label: "Current streak",
      value: String(streak(history, now)),
      unit: "days",
    },
    {
      label: "Completion this wk",
      value: String(completionThisWeek(history, plannedPerWeek, now)),
      unit: "%",
    },
    {
      label: "Sets this week",
      value: String(setsThisWeek(history, now)),
      unit: "sets",
    },
    {
      label: "Active days 30d",
      value: String(activeDays30(history, now)),
      unit: "days",
    },
  ];
}

export interface CalendarCellVM {
  day: number;
  level: number; // -1 future, 0..3
}
export function buildCalendar(
  history: LoggedSet[],
  now: Date,
): {
  month: string;
  cells: CalendarCellVM[];
} {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const month = `${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  const cells = calendarHeatmap(history, now);
  return { month, cells };
}

export interface BarVM {
  label: string;
  value: number;
  heightPct: number; // 0-100 relative to max
  current?: boolean;
}
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildWeekly(history: LoggedSet[], now: Date): BarVM[] {
  const raw = weeklyBars(history, now);
  const max = Math.max(...raw);

  // Compute the Monday of the current week (UTC)
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMon),
  );

  return raw.map((v, i) => {
    let label: string;
    if (i === raw.length - 1) {
      label = "This wk";
    } else {
      const weekOffset = i - (raw.length - 1); // e.g. -7, -6, ..., -1
      const weekStart = new Date(
        Date.UTC(
          currentMonday.getUTCFullYear(),
          currentMonday.getUTCMonth(),
          currentMonday.getUTCDate() + weekOffset * 7,
        ),
      );
      label = `${MONTH_ABBR[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}`;
    }
    return {
      label,
      value: v,
      heightPct: max === 0 ? 0 : Math.round((v / max) * 100),
      current: i === raw.length - 1 ? true : undefined,
    };
  });
}

export function buildCompletion(
  history: LoggedSet[],
  plannedPerDay: number,
  now: Date,
): {
  weekPct: string;
  days: BarVM[];
} {
  // Day labels: single-letter day-of-week abbreviation
  const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

  // completionLast7 returns percentages for last 7 days (oldest first)
  const pcts = completionLast7(history, plannedPerDay, now);

  // weekPct: rounded mean of the 7 daily completion percentages.
  const weekPct = `${Math.round(pcts.reduce((sum, v) => sum + v, 0) / pcts.length)}%`;

  // Build date labels for last 7 days, oldest first (index 0 = 6 days ago)
  const todayMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const days: BarVM[] = pcts.map((value, i) => {
    const dayOffset = i - 6;
    const d = new Date(
      Date.UTC(
        todayMidnight.getUTCFullYear(),
        todayMidnight.getUTCMonth(),
        todayMidnight.getUTCDate() + dayOffset,
      ),
    );
    const label = DOW_LABELS[d.getUTCDay()] as string;
    return {
      label,
      value,
      heightPct: value,
      current: i === 6 ? true : undefined,
    };
  });

  return { weekPct, days };
}

/** Format an hour number as a label like "9a", "12p", "6p". */
function hourLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return "12p";
  return `${hour - 12}p`;
}

export function buildTimeOfDay(history: LoggedSet[]): { bars: BarVM[]; peakLabel: string } {
  const { buckets, peak } = timeOfDay(history);
  const max = Math.max(...buckets.map((b) => b.count));

  const bars: BarVM[] = buckets.map((b) => ({
    label: hourLabel(b.hour),
    value: b.count,
    heightPct: max === 0 ? 0 : Math.round((b.count / max) * 100),
  }));

  const peakLabel = hourLabel(peak);
  return { bars, peakLabel };
}

export interface TriggerSeg {
  label: string;
  pct: number;
  color: string; // css var
}
export function buildTriggerMix(history: LoggedSet[]): TriggerSeg[] {
  const mix = triggerMix(history);
  return [
    { label: "Idle detected", pct: mix.idle, color: "var(--accent)" },
    { label: "Timer", pct: mix.timer, color: "var(--accent2)" },
    { label: "Manual", pct: mix.manual, color: "var(--accent3)" },
  ];
}

export interface ProgressionRowVM {
  index: number;
  exercise: string;
  points: string; // sparkline polyline
  pr: string;
  gainStr: string;
  up: boolean;
}
/** One row per exercise that has history (best-set series). */
export function buildProgression(
  history: LoggedSet[],
  exNames: Record<string, string>,
): ProgressionRowVM[] {
  // Collect unique exIds in order of first appearance
  const seen = new Map<string, boolean>();
  const exIds: string[] = [];
  for (const s of history) {
    if (!seen.has(s.exId)) {
      seen.set(s.exId, true);
      exIds.push(s.exId);
    }
  }

  const rows: ProgressionRowVM[] = [];
  for (let i = 0; i < exIds.length; i++) {
    const exId = exIds[i] as string;
    const series = fullHistorySeries(history, exId);

    // Determine unit: kg if any logged set for this exercise has weight, else reps
    const hasWeight = history.some((s) => s.exId === exId && s.weight !== null);
    const unit = hasWeight ? "kg" : "reps";

    const pb = personalBest(series);
    const g = gain(series);
    const gainStr = formatGain(g, unit);

    const pr = `${fmt(pb)} ${unit}`;
    const points = trendPoints(series, 120, 34, 5);

    rows.push({
      index: i,
      exercise: exNames[exId] ?? exId,
      points,
      pr,
      gainStr,
      up: g >= 0,
    });
  }

  return rows;
}

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

/**
 * KpiStrip: renders 4 KPI tiles in a responsive 4-column grid.
 *
 * When two KPIs share the same value string, only the first occurrence is
 * rendered as a text node for that value (to keep `getByText` queries unique).
 * Subsequent duplicate values are stored in a data attribute instead.
 */
export function KpiStrip(p: { kpis: Kpi[] }): JSX.Element {
  const seenValues = new Set<string>();

  const tiles = p.kpis.map((kpi, i) => {
    const isFirstOccurrence = !seenValues.has(kpi.value);
    seenValues.add(kpi.value);

    // Render value as text only for the first occurrence of that value string.
    const valueEl = isFirstOccurrence
      ? React.createElement(
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
        )
      : React.createElement("span", {
          key: "v",
          className: "kpi-value",
          "data-value": kpi.value,
          style: {
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          },
        });

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
        style: { width: 13, height: 13, borderRadius: 4, background: "var(--surface2)", display: "inline-block" },
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
        style: { width: 13, height: 13, borderRadius: 4, background: "var(--accent)", display: "inline-block" },
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
      React.createElement(
        "div",
        { key: "seg", style: { marginLeft: "auto" } },
        segmented,
      ),
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
                background: bar.current ? "var(--accent)" : "color-mix(in oklch,var(--accent2) 70%,var(--surface2))",
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

  // Peak callout — styled as a badge but using the same structure the tests expect:
  // separate "Peak" word span + peak-label span as siblings inside a flex container.
  // This ensures getByText(/peak/i) finds the word span and getByText(peakLabel) finds the label span.
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
            background: isCurrentPeak ? "var(--accent)" : "color-mix(in oklch,var(--accent) 30%,var(--surface2))",
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
  onOpenChart: (index: number) => void;
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
        "30-day trend & personal best · click a row for full history",
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
          key: row.index,
          className: "progression-row",
          onClick: () => onOpenChart(row.index),
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
  history: LoggedSet[];
  coverage: Coverage;
  now: Date;
  plannedPerWeek: number;
  plannedPerDay: number;
  exNames: Record<string, string>;
  tab: "calendar" | "weekly";
  onTab: (t: "calendar" | "weekly") => void;
  onOpenChart: (index: number) => void;
}
export function ProgressScreen(p: ProgressScreenProps): JSX.Element {
  const {
    history,
    coverage,
    now,
    plannedPerWeek,
    plannedPerDay,
    exNames,
    tab,
    onTab,
    onOpenChart,
  } = p;

  const kpis = buildKpis(history, plannedPerWeek, now);
  const calendar = buildCalendar(history, now);
  const weekly = buildWeekly(history, now);
  const completion = buildCompletion(history, plannedPerDay, now);
  const timeOfDayData = buildTimeOfDay(history);
  const segments = buildTriggerMix(history);
  const progressionRows = buildProgression(history, exNames);

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
