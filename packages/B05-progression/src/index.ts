// @nabd/progression — pure suggestion & progression engine.

import type { TrackingType, LoggedSet } from "@nabd/domain";
import { WEIGHTED_TRACKS, TIME_TRACKS } from "@nabd/domain";

export interface LastResult {
  sets: number;
  reps: number;
  weight: number | null;
}

export interface Suggestion {
  sets: number;
  reps: number;
  weight: number | null;
  note: string;
  up: boolean;
}

/**
 * Next-set suggestion from last result. Weighted -> +2.5 kg; time-based -> +5 s;
 * else +1 rep. Falls back to a sensible default when there is no history.
 */
export function suggest(track: TrackingType, last: LastResult | null): Suggestion {
  const isWeighted = WEIGHTED_TRACKS.has(track);
  const isTime = TIME_TRACKS.has(track);

  if (last === null) {
    return {
      sets: 3,
      reps: isTime ? 30 : 10,
      weight: isWeighted ? 20 : null,
      note: "",
      up: true,
    };
  }

  if (isTime) {
    return {
      sets: 3,
      reps: last.reps + 5,
      weight: null,
      note: "+5 s over last session",
      up: true,
    };
  }

  if (isWeighted) {
    return {
      sets: 3,
      reps: last.reps,
      weight: (last.weight as number) + 2.5,
      note: "+2.5 kg over last session",
      up: true,
    };
  }

  return {
    sets: 3,
    reps: last.reps + 1,
    weight: null,
    note: "+1 rep over last session",
    up: true,
  };
}

/** Personal best from a value series (max), respecting the tracking unit. */
export function personalBest(series: number[]): number {
  if (series.length === 0) return 0;
  return Math.max(...series);
}

/** Estimated 1RM via Epley: w * (1 + reps/30). */
export function estimate1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

/** SVG polyline points string for a series within W x H with padding. */
export function trendPoints(series: number[], w: number, h: number, pad: number): string {
  const n = series.length;
  const xRange = w - 2 * pad;
  const yRange = h - 2 * pad;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;

  return series
    .map((v, i) => {
      const x = n === 1 ? pad : pad + (i / (n - 1)) * xRange;
      const normY = span === 0 ? 0.5 : (v - min) / span;
      // SVG y is inverted: higher value → lower y coordinate
      const y = pad + (1 - normY) * yRange;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Last value minus first value of a series. */
export function gain(series: number[]): number {
  if (series.length <= 1) return 0;
  return series[series.length - 1] - series[0];
}

/** Best-working-set-per-session series for an exercise from history. */
export function fullHistorySeries(history: LoggedSet[], exId: string): number[] {
  const filtered = history.filter((s) => s.exId === exId);

  const byDate = new Map<string, number>();
  for (const s of filtered) {
    const val = s.weight !== null ? estimate1RM(s.weight, s.value) : s.value;
    const prev = byDate.get(s.date);
    byDate.set(s.date, prev === undefined ? val : Math.max(prev, val));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

/** Format a gain with sign and unit, e.g. "+2.5 kg" / "+1 rep". */
export function formatGain(value: number, unit: string): string {
  const isWhole = value === Math.floor(value);
  const absStr = isWhole ? String(Math.abs(value)) : Math.abs(value).toFixed(1);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${absStr} ${unit}`;
}
