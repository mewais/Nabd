// How sets, targets and advice are worded — shared by the Today screen and the logger.

import type { Prescription, SetSpec, TrackingType, WeightUnit } from "@nabd/domain";
import { formatWeight, isTimeBased, plural } from "@nabd/domain";
import type { Advice, AdviceKind, Performance } from "@nabd/progression";

const SET_TYPE_NAMES: Record<SetSpec["type"], string> = {
  warmup: "Warm-up",
  working: "Working set",
  drop: "Drop set",
};

/** "9 × 25 lb", "12 reps", "45 s", "45 s · 10 kg", "8 − 20 kg assist". */
export function formatPerformance(
  { reps, weight }: Performance,
  tracking: TrackingType,
  unit: WeightUnit,
): string {
  const amount = isTimeBased(tracking) ? `${reps} s` : `${reps}`;
  if (weight === null) return isTimeBased(tracking) ? amount : plural(reps, "rep");
  const load = formatWeight(weight, unit);
  if (tracking === "assisted_bodyweight") return `${amount} − ${load} assist`;
  if (tracking === "weighted_bodyweight") return `${amount} + ${load}`;
  return isTimeBased(tracking) ? `${amount} · ${load}` : `${amount} × ${load}`;
}

/** What a prescribed set asks for: "Working set · 8–12 reps · RPE 8". */
export function formatTarget(spec: SetSpec, prescription: Prescription): string {
  const amount =
    prescription.repMode === "time"
      ? `${spec.a} s`
      : spec.b !== undefined && spec.b !== spec.a
        ? `${spec.a}–${plural(spec.b, "rep")}`
        : plural(spec.a, "rep");
  const parts = [SET_TYPE_NAMES[spec.type], amount];
  if (spec.val !== undefined && prescription.intensity === "rpe") parts.push(`RPE ${spec.val}`);
  if (spec.val !== undefined && prescription.intensity === "pct") parts.push(`${spec.val}% 1RM`);
  return parts.join(" · ");
}

const ADVICE_REASONS: Record<AdviceKind, string> = {
  start: "First time — start light and find your level.",
  reach_range: "Below your range last time — same load, reach the range first.",
  add_reps: "Inside your range — beat last time.",
  add_load: "You topped your range — time to go heavier.",
  beyond_range: "You topped your range — keep adding.",
  deload: "Two sessions short of your range — back off one step and rebuild.",
};

export interface AdviceWording {
  /** The headline target, e.g. "9 × 25 lb". */
  primary: string;
  /** The other option, e.g. "8 × 27.5 lb"; null when there is only one way forward. */
  alternative: string | null;
  /** Why, in a sentence. */
  reason: string;
  /** What it was compared against: "Last time: 8 × 25 lb"; null with no history. */
  basis: string | null;
}

/** Advice in words; null in, null out. */
export function describeAdvice(
  advice: Advice | null,
  tracking: TrackingType,
  unit: WeightUnit,
): AdviceWording | null {
  if (advice === null) return null;
  const say = (p: Performance): string => formatPerformance(p, tracking, unit);
  // A first-time load of zero is "not known yet", not a target to aim for.
  const loadUnknown = advice.kind === "start" && advice.primary.weight === 0;
  return {
    primary: loadUnknown
      ? `${say({ ...advice.primary, weight: null })} — pick a starting weight`
      : say(advice.primary),
    alternative: advice.alternative && say(advice.alternative),
    reason: ADVICE_REASONS[advice.kind],
    basis: advice.basis && `Last time: ${say(advice.basis)}`,
  };
}
