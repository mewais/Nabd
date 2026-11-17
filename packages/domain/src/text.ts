import { roundTo } from "./numbers";

/** A count with its noun, pluralised with a plain "s": "1 set", "3 sets", "0 sets". */
export function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/** "M:SS" for a duration in whole seconds: "1:30", "0:45". */
export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A value with at most one decimal and its unit: "71.1 kg e1RM", "12 reps". */
export function formatAmount(value: number, unit: string): string {
  return `${roundTo(value, 1)} ${unit}`;
}

/** A signed change: "+2.5 kg e1RM", "-1 reps", "0 reps". */
export function formatGain(value: number, unit: string): string {
  return `${value > 0 ? "+" : ""}${formatAmount(value, unit)}`;
}

/**
 * A suggestion for a set, in words: what the coach's advice says (the session
 * package words it), and what the advice card shows.
 */
export interface AdviceWording {
  /** The headline target, e.g. "9 × 25 lb". */
  primary: string;
  /** The other way forward, e.g. "8 × 27.5 lb"; null when there is only one. */
  alternative: string | null;
  /** Why, in a sentence. */
  reason: string;
  /** What it was compared against: "Last time: 8 × 25 lb"; null with no history. */
  basis: string | null;
}
