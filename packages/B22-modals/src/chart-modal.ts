import React from "react";
import { plural } from "@nabd/domain";
import type { ExerciseTrend } from "@nabd/progression";
import { formatAmount, formatGain, trendPoints } from "@nabd/progression";
import { CloseButton, ModalShell } from "./modal-shell";

/** Everything the full-history chart draws. */
export interface ChartVM {
  exercise: string;
  startLabel: string;
  nowLabel: string;
  sessions: number;
  pr: string;
  current: string;
  gainAll: string;
  /** SVG polyline + area points. */
  points: string;
  areaPoints: string;
  viewBox: string;
  gridY: { y: string; label: string }[];
}
export interface ChartModalProps {
  vm: ChartVM;
  onClose: () => void;
}
export function FullHistoryChartModal(_p: ChartModalProps): JSX.Element {
  const { vm, onClose } = _p;

  const gridLines = vm.gridY.map((g, i) =>
    React.createElement(
      "g",
      { key: i },
      React.createElement("line", {
        x1: 30,
        x2: 650,
        y1: g.y,
        y2: g.y,
        stroke: "var(--line)",
        strokeWidth: 1,
      }),
      React.createElement(
        "text",
        {
          x: 6,
          y: g.y,
          dy: 4,
          fill: "var(--text3)",
          fontSize: 11,
        },
        g.label,
      ),
    ),
  );

  const statTile = (label: string, value: string | number, color?: string) =>
    React.createElement(
      "div",
      {
        style: {
          flex: 1,
          background: "var(--surface2)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "13px 15px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 10.5,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: ".04em",
          },
        },
        label,
      ),
      React.createElement(
        "div",
        {
          style: {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 21,
            fontWeight: 600,
            marginTop: 5,
            ...(color ? { color } : {}),
          },
        },
        value,
      ),
    );

  return React.createElement(
    ModalShell,
    {
      onClose,
      zIndex: 80,
      panelStyle: { width: 760, background: "var(--surface)", padding: 24 },
    },
    // Header
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        },
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          {
            style: {
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".12em",
              color: "var(--accent)",
              fontFamily: "'JetBrains Mono', monospace",
            },
          },
          "FULL HISTORY",
        ),
        React.createElement(
          "div",
          { style: { fontSize: 24, fontWeight: 800, letterSpacing: "-.02em", marginTop: 5 } },
          vm.exercise,
        ),
        React.createElement(
          "div",
          { style: { fontSize: 12, color: "var(--text3)", marginTop: 2 } },
          `Since ${vm.startLabel} · ${plural(vm.sessions, "session")}`,
        ),
      ),
      React.createElement(CloseButton, { onClose }),
    ),
    // Stat tiles
    React.createElement(
      "div",
      { style: { display: "flex", gap: 10, marginTop: 18 } },
      statTile("PERSONAL BEST", vm.pr, "var(--accent)"),
      statTile("CURRENT", vm.current),
      statTile("ALL-TIME GAIN", vm.gainAll, "var(--accent2)"),
    ),
    // Chart
    React.createElement(
      "div",
      {
        style: {
          marginTop: 18,
          border: "1px solid var(--line)",
          borderRadius: 13,
          padding: "16px 12px 8px",
          background: "var(--surface2)",
        },
      },
      React.createElement(
        "svg",
        {
          viewBox: vm.viewBox,
          style: {
            width: "100%",
            height: "auto",
            display: "block",
            fontFamily: "'JetBrains Mono', monospace",
          },
        },
        ...gridLines,
        React.createElement("polygon", {
          points: vm.areaPoints,
          fill: "color-mix(in oklch, var(--accent) 12%, transparent)",
          stroke: "none",
        }),
        React.createElement("polyline", {
          points: vm.points,
          fill: "none",
          stroke: "var(--accent)",
          strokeWidth: 2.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 8px 2px",
            fontSize: 11,
            color: "var(--text3)",
            fontFamily: "'JetBrains Mono', monospace",
          },
        },
        React.createElement("span", null, vm.startLabel),
        React.createElement("span", null, vm.nowLabel),
      ),
    ),
  );
}

const CHART = { width: 680, height: 240, pad: 30 };

/** Build the chart from an exercise's trend. */
export function buildChartVM(exercise: string, trend: ExerciseTrend): ChartVM {
  const { width, height, pad } = CHART;
  const { series, unit } = trend;
  const points = trendPoints(series, width, height, pad);
  const min = Math.min(...series);
  const span = trend.best - min;
  const yFor = (value: number): string => {
    const level = span === 0 ? 0.5 : (value - min) / span;
    return (pad + (1 - level) * (height - 2 * pad)).toFixed(1);
  };
  const gridline = (value: number) => ({
    y: yFor(value),
    label: String(Math.round(value * 10) / 10),
  });

  return {
    exercise,
    startLabel: trend.since,
    nowLabel: "Now",
    sessions: series.length,
    pr: formatAmount(trend.best, unit),
    current: formatAmount(trend.current, unit),
    gainAll: formatGain(trend.gain, unit),
    points,
    // The line, closed down to the baseline at both ends.
    areaPoints: `${pad},${height - pad} ${points} ${width - pad},${height - pad}`,
    viewBox: `0 0 ${width} ${height}`,
    gridY: [gridline(trend.best), gridline((trend.best + min) / 2), gridline(min)],
  };
}
