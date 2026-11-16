import type { WeightUnit } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import type { Coach } from "./coach";
import { describeAdvice, formatTarget } from "./wording";
import type { AdviceWording } from "./wording";

export interface NextSetWording {
  /** What the plan asks for this set; null for an unplanned extra or a finished exercise. */
  target: string | null;
  /** The plan's note on the exercise; empty when there is none. */
  notes: string;
  /** Null for a warm-up, which is not something to progress on. */
  advice: AdviceWording | null;
}

/** The next set of an exercise in words: its target, the plan's note and the coach's advice. */
export function describeNextSet(item: PlanItem, coach: Coach, unit: WeightUnit): NextSetWording {
  const spec = item.nextSet;
  return {
    target: spec && item.prescription && formatTarget(spec, item.prescription),
    notes: item.prescription?.notes ?? "",
    advice: describeAdvice(coach.adviceFor(item), item.exercise.tracking, unit),
  };
}
