// How a trend's numbers are worded: a value with the unit its series is measured in.

/** A value with at most one decimal and its unit: "71.1 kg e1RM", "12 reps". */
export function formatAmount(value: number, unit: string): string {
  return `${Math.round(value * 10) / 10} ${unit}`;
}

/** A signed change: "+2.5 kg e1RM", "-1 reps", "0 reps". */
export function formatGain(value: number, unit: string): string {
  return `${value > 0 ? "+" : ""}${formatAmount(value, unit)}`;
}
