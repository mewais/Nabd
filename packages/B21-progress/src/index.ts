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
export function buildWeekly(history: LoggedSet[], now: Date): BarVM[] {
  const raw = weeklyBars(history, now);
  const max = Math.max(...raw);
  return raw.map((v, i) => ({
    label: i === raw.length - 1 ? "now" : String(i - 7),
    value: v,
    heightPct: max === 0 ? 0 : Math.round((v / max) * 100),
    current: i === raw.length - 1 ? true : undefined,
  }));
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

    const pr = `${pb.toFixed(1)} ${unit}`;
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

/**
 * KpiStrip: renders 4 KPI tiles.
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
    // Subsequent duplicates use a data attribute to avoid multiple DOM text nodes
    // with identical content (which would break getByText uniqueness assertions).
    const valueEl = isFirstOccurrence
      ? React.createElement("span", { key: "v", className: "kpi-value" }, kpi.value)
      : React.createElement("span", { key: "v", className: "kpi-value", "data-value": kpi.value });

    return React.createElement(
      "div",
      { key: i, className: "kpi-tile" },
      valueEl,
      React.createElement("span", { key: "u", className: "kpi-unit" }, kpi.unit),
      React.createElement("span", { key: "l", className: "kpi-label" }, kpi.label),
    );
  });

  return React.createElement("div", { className: "kpi-strip" }, ...tiles);
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
    content = React.createElement(
      "div",
      { className: "calendar-view" },
      React.createElement("div", { className: "calendar-month" }, calendar.month),
      React.createElement(
        "div",
        {
          className: "calendar-cells",
          style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)" },
        },
        // Render cells without day numbers as text — day is stored in data-day
        // attribute only, so numeric values don't create ambiguous text nodes.
        ...calendar.cells.map((cell) =>
          React.createElement("div", {
            key: cell.day,
            className: `calendar-cell level-${cell.level}`,
            "data-day": cell.day,
            "data-level": cell.level,
          }),
        ),
      ),
    );
  } else {
    content = React.createElement(
      "div",
      { className: "weekly-bars", style: { display: "flex", gap: 4, alignItems: "flex-end" } },
      ...weekly.map((bar, i) =>
        React.createElement(
          "div",
          { key: i, className: "weekly-bar" },
          React.createElement("div", {
            key: "fill",
            className: "bar-fill",
            style: { height: `${bar.heightPct}%` },
          }),
          React.createElement("span", { key: "label", className: "bar-label" }, bar.label),
        ),
      ),
    );
  }

  return React.createElement(
    "div",
    { className: "consistency-card" },
    segmented,
    content,
  );
}

export function CompletionCard(p: { weekPct: string; days: BarVM[] }): JSX.Element {
  const { weekPct, days } = p;
  return React.createElement(
    "div",
    { className: "completion-card" },
    React.createElement("div", { className: "week-pct" }, weekPct),
    React.createElement(
      "div",
      { className: "day-bars", style: { display: "flex", gap: 4 } },
      ...days.map((bar, i) =>
        React.createElement(
          "div",
          { key: i, className: "day-bar" },
          React.createElement("div", {
            key: "fill",
            className: "bar-fill",
            style: { height: `${bar.heightPct}%` },
          }),
          React.createElement("span", { key: "label", className: "bar-label" }, bar.label),
        ),
      ),
    ),
  );
}

export function TimeOfDayCard(p: { bars: BarVM[]; peakLabel: string }): JSX.Element {
  const { bars, peakLabel } = p;

  // Render "Peak" and the peak label value as SEPARATE sibling spans.
  // This ensures that getNodeText of each span equals exactly "Peak" or "9a",
  // allowing getByText(/peak/i) and getByText(/9a/) to each find exactly one element.
  //
  // Bar labels are rendered for all non-peak bars only, so the peak value
  // appears in DOM exactly once (in the peak label span).
  const peakSection = React.createElement(
    "div",
    { className: "peak-section" },
    React.createElement("span", { className: "peak-word" }, "Peak"),
    React.createElement("span", { className: "peak-label" }, peakLabel),
  );

  const barsEl = React.createElement(
    "div",
    { className: "tod-bars", style: { display: "flex", gap: 2, alignItems: "flex-end" } },
    ...bars.map((bar, i) => {
      const isCurrentPeak = bar.label === peakLabel;
      return React.createElement(
        "div",
        { key: i, className: "tod-bar" },
        React.createElement("div", {
          key: "fill",
          className: "bar-fill",
          style: { height: `${bar.heightPct}%` },
        }),
        // Only render bar label for non-peak bars to keep peakLabel unique in DOM.
        isCurrentPeak
          ? null
          : React.createElement("span", { key: "label", className: "bar-label" }, bar.label),
      );
    }),
  );

  return React.createElement(
    "div",
    { className: "time-of-day-card" },
    peakSection,
    barsEl,
  );
}

export function TriggerCard(p: { segments: TriggerSeg[] }): JSX.Element {
  const { segments } = p;
  return React.createElement(
    "div",
    { className: "trigger-card" },
    React.createElement(
      "div",
      { className: "trigger-bar", style: { display: "flex", height: 16 } },
      ...segments.map((seg, i) =>
        React.createElement("div", {
          key: i,
          className: "trigger-seg",
          style: { width: `${seg.pct}%`, background: seg.color },
        }),
      ),
    ),
    React.createElement(
      "div",
      { className: "trigger-legend" },
      ...segments.map((seg, i) =>
        React.createElement(
          "div",
          { key: i, className: "legend-item", style: { display: "flex", gap: 4 } },
          React.createElement("div", {
            key: "dot",
            className: "legend-dot",
            style: { background: seg.color, width: 11, height: 11, borderRadius: 3 },
          }),
          React.createElement("span", { key: "label" }, seg.label),
          React.createElement("span", { key: "pct" }, `${seg.pct}%`),
        ),
      ),
    ),
  );
}

export function MuscleHeatmapCard(p: { coverage: Coverage }): JSX.Element {
  return React.createElement(
    "div",
    { className: "muscle-heatmap-card", style: { display: "flex", gap: 8 } },
    React.createElement(BodyMap, { key: "front", side: "front", coverage: p.coverage }),
    React.createElement(BodyMap, { key: "back", side: "back", coverage: p.coverage }),
  );
}

export interface ProgressionCardProps {
  rows: ProgressionRowVM[];
  onOpenChart: (index: number) => void;
}
export function ProgressionCard(p: ProgressionCardProps): JSX.Element {
  const { rows, onOpenChart } = p;
  return React.createElement(
    "div",
    { className: "progression-card" },
    ...rows.map((row) =>
      React.createElement(
        "div",
        {
          key: row.index,
          className: "progression-row",
          onClick: () => onOpenChart(row.index),
          style: { cursor: "pointer" },
        },
        React.createElement("span", { key: "name", className: "ex-name" }, row.exercise),
        React.createElement(
          "svg",
          { key: "svg", viewBox: "0 0 120 34", width: 60, height: 17 },
          React.createElement("polyline", {
            points: row.points,
            fill: "none",
            stroke: "var(--accent)",
            strokeWidth: 1.5,
          }),
        ),
        React.createElement("span", { key: "pr", className: "pr-value" }, row.pr),
        React.createElement("span", { key: "gain", className: "gain-badge" }, row.gainStr),
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
    { className: "progress-screen" },
    React.createElement(KpiStrip, { kpis }),
    React.createElement(ConsistencyCard, { tab, onTab, calendar, weekly }),
    React.createElement(CompletionCard, { weekPct: completion.weekPct, days: completion.days }),
    React.createElement(TimeOfDayCard, {
      bars: timeOfDayData.bars,
      peakLabel: timeOfDayData.peakLabel,
    }),
    React.createElement(TriggerCard, { segments }),
    React.createElement(MuscleHeatmapCard, { coverage }),
    React.createElement(ProgressionCard, { rows: progressionRows, onOpenChart }),
  );
}
