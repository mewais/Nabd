import type { WeightUnit } from "@nabd/domain";
import { muscleNames } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import type { Coach } from "./coach";
import { describeAdvice, describeSetPosition, formatTarget } from "./wording";
import type { AdviceWording } from "./wording";

/** The next set of an exercise in words: everything Today and the logger say about it. */
export interface NextSetWording {
  exercise: string;
  /** "Set 2 of 4" (see {@link describeSetPosition}). */
  position: string;
  /** What the plan asks for this set; null for an unplanned extra or a finished exercise. */
  target: string | null;
  /** The muscles worked, primary ones first. */
  muscleNames: string[];
  /** The plan's note on the exercise; empty when there is none. */
  notes: string;
  /** Null for a warm-up, which is not something to progress on. */
  advice: AdviceWording | null;
}

export function describeNextSet(item: PlanItem, coach: Coach, unit: WeightUnit): NextSetWording {
  const spec = item.nextSet;
  return {
    exercise: item.exercise.name,
    position: describeSetPosition(item),
    target: spec && item.prescription && formatTarget(spec, item.prescription),
    muscleNames: muscleNames(item.exercise),
    notes: item.prescription?.notes ?? "",
    advice: describeAdvice(coach.adviceFor(item), item.exercise.tracking, unit),
  };
}
