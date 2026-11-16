/** Bar heights, 0–100, relative to the tallest of `values`. */
export function relativeHeights(values: readonly number[]): number[] {
  const max = Math.max(...values);
  return values.map((value) => (max === 0 ? 0 : Math.round((value / max) * 100)));
}
