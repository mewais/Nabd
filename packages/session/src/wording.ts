// How sets, targets, progress and advice are worded — shared by the Today
// screen, the logger and the nudge toast.

import type { Prescription, SetSpec, TrackingType, WeightUnit } from "@nabd/domain";
import {
  INTENSITY_NAMES,
  SET_TYPE_NAMES,
  formatWeight,
  isBodyweightLoaded,
  isTimeBased,
  needsLoad,
  plural,
} from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import { prescribedIntensity, repsInReserve } from "@nabd/progression";
import type { Advice, AdviceKind, IntensityBasis, Performance } from "@nabd/progression";

/**
 * "9 × 25 lb", "12 reps", "45 s", "45 s · 10 kg", "8 + 5 kg", "8 − 20 kg assist".
 * A bodyweight exercise with nothing added or taken off is the plain exercise:
 * "12 reps", not "12 + 0 kg".
 */
export function formatPerformance(
  { reps, weight }: Performance,
  tracking: TrackingType,
  unit: WeightUnit,
): string {
  const amount = isTimeBased(tracking) ? `${reps} s` : `${reps}`;
  if (weight === null || (weight === 0 && isBodyweightLoaded(tracking))) {
    return isTimeBased(tracking) ? amount : plural(reps, "rep");
  }
  const load = formatWeight(weight, unit);
  if (tracking === "assisted_bodyweight") return `${amount} − ${load} assist`;
  if (tracking === "weighted_bodyweight") return `${amount} + ${load}`;
  return isTimeBased(tracking) ? `${amount} · ${load}` : `${amount} × ${load}`;
}

/** How much a prescribed set asks for: "45 s", "8–12 reps", "10 reps". */
function formatAmountAsked(spec: SetSpec, prescription: Prescription): string {
  if (prescription.repMode === "time") return `${spec.amount} s`;
  if (spec.upTo === undefined || spec.upTo === spec.amount) return plural(spec.amount, "rep");
  return `${spec.amount}–${plural(spec.upTo, "rep")}`;
}

/** How hard a set should be: "RPE 8", "70% 1RM". */
function formatIntensity({ kind, value }: Pick<IntensityBasis, "kind" | "value">): string {
  return kind === "rpe" ? `${INTENSITY_NAMES.rpe} ${value}` : `${value}% 1RM`;
}

/** How hard a prescribed set should be; null when load is not prescribed. */
function formatIntensityAsked(spec: SetSpec, prescription: Prescription): string | null {
  const asked = prescribedIntensity(prescription, spec);
  return asked && formatIntensity(asked);
}

/** What a prescribed set asks for: "Working set · 8–12 reps · RPE 8". */
export function formatTarget(spec: SetSpec, prescription: Prescription): string {
  return [
    SET_TYPE_NAMES[spec.type],
    formatAmountAsked(spec, prescription),
    formatIntensityAsked(spec, prescription),
  ]
    .filter((part) => part !== null)
    .join(" · ");
}

/**
 * Which set of the exercise comes next: "Set 2 of 4"; just "Set 3" for an
 * unplanned extra; "All 4 sets done — extra set" beyond the prescription.
 */
export function describeSetPosition(item: PlanItem): string {
  if (item.isExtra) return `Set ${item.done + 1}`;
  if (item.remaining === 0) return `All ${plural(item.planned, "set")} done — extra set`;
  return `Set ${item.done + 1} of ${item.planned}`;
}

/** Sets done against sets planned: "2/4"; just "3" for an unplanned extra. */
export function formatSetTally(item: PlanItem): string {
  return item.isExtra ? String(item.done) : `${item.done}/${item.planned}`;
}

const ADVICE_REASONS: Record<AdviceKind, string> = {
  start: "First time — start light and find your level.",
  reach_range: "Below your range last time — same load, reach the range first.",
  add_reps: "Inside your range — beat last time.",
  add_load: "You topped your range — time to go heavier.",
  beyond_range: "You topped your range — keep adding.",
  deload: "Two sessions short of your range — back off one step and rebuild.",
};

/**
 * Why, in a sentence: the intensity that set the load, or double progression's
 * reason — with a note on the intensity that is waiting for an estimate to
 * apply to.
 */
function describeReason({ kind, intensity }: Advice, unit: WeightUnit): string {
  if (intensity === null) return ADVICE_REASONS[kind];
  if (intensity.max === null) {
    return `${ADVICE_REASONS[kind]} ${formatIntensity(intensity)} applies once there is history.`;
  }
  if (intensity.kind === "pct") {
    return `${intensity.value}% of your estimated max (${formatWeight(intensity.max, unit)}).`;
  }
  return `${formatIntensity(intensity)} ≈ ${plural(repsInReserve(intensity.value), "rep")} in reserve.`;
}

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
  // Where a load has to be picked, a first-time load of zero is "not known yet",
  // not a target to aim for. (A bodyweight exercise simply starts unloaded.)
  const loadUnknown = advice.kind === "start" && advice.primary.weight === 0 && needsLoad(tracking);
  return {
    primary: loadUnknown
      ? `${say({ ...advice.primary, weight: null })} — pick a starting weight`
      : say(advice.primary),
    alternative: advice.alternative && say(advice.alternative),
    reason: describeReason(advice, unit),
    basis: advice.basis && `Last time: ${say(advice.basis)}`,
  };
}
