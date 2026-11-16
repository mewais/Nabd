/** Which way a step goes: back (-1) or on (+1) — earlier or later, less or more. */
export type Direction = -1 | 1;

/** `value` rounded to `decimals` places, so stepped decimals stay free of floating-point dust. */
export function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/** `value` held within `min`–`max`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
