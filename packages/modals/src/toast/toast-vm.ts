import type { NudgeStatus } from "@nabd/nudge";
import { describeNudge } from "@nabd/nudge";
import type { PlanItem } from "@nabd/scheduling";

/** What the nudge toast says. */
export interface ToastVM {
  title: string;
  /** Why now: "Interval's up" or "You've gone quiet". */
  reason: string;
  exercise: string;
  /** Where the set sits in the plan: "Push · set 2 of 4". */
  detail: string;
}

/** The toast for a due nudge towards `next`; null when no set is due or nothing is left to do. */
export function buildToastVM(next: PlanItem | null, nudge: NudgeStatus): ToastVM | null {
  if (nudge.state !== "due" || next === null) return null;
  return {
    title: "Time to move",
    reason: describeNudge(nudge),
    exercise: next.exercise.name,
    detail: `${next.label} · set ${next.done + 1} of ${next.planned}`,
  };
}
