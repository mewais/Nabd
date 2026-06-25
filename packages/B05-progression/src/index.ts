// @nabd/progression — pure suggestion & progression engine.
// SKELETON: signatures frozen; bodies throw until implemented.

import type { TrackingType, LoggedSet } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

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
export function suggest(_track: TrackingType, _last: LastResult | null): Suggestion {
  return NI();
}

/** Personal best from a value series (max), respecting the tracking unit. */
export function personalBest(_series: number[]): number {
  return NI();
}

/** Estimated 1RM via Epley: w * (1 + reps/30). */
export function estimate1RM(_weight: number, _reps: number): number {
  return NI();
}

/** SVG polyline points string for a series within W x H with padding. */
export function trendPoints(_series: number[], _w: number, _h: number, _pad: number): string {
  return NI();
}

/** Last value minus first value of a series. */
export function gain(_series: number[]): number {
  return NI();
}

/** Best-working-set-per-session series for an exercise from history. */
export function fullHistorySeries(_history: LoggedSet[], _exId: string): number[] {
  return NI();
}

/** Format a gain with sign and unit, e.g. "+2.5 kg" / "+1 rep". */
export function formatGain(_value: number, _unit: string): string {
  return NI();
}
