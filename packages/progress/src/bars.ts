import { percentOf } from "@nabd/domain";

/** Bar heights, 0–100, relative to the tallest of `values`. */
export function relativeHeights(values: readonly number[]): number[] {
  const max = Math.max(...values);
  return values.map((value) => percentOf(value, max));
}
