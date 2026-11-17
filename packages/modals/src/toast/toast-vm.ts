import type { NudgeStatus } from "@nabd/nudge";
import { describeNudge } from "@nabd/nudge";
import type { PlanItem } from "@nabd/scheduling";
import { describeSetPosition } from "@nabd/session";

/** What the nudge toast says. */
export interface ToastVM {
  title: string;
  /** Why now: "Interval's up" or "You've gone quiet". */
  reason: string;
  exercise: string;
  /** Where the set sits in the plan: "Push · Set 2 of 4". */
  detail: string;
  /** The same nudge as the desktop announces it, for when the window is not in front. */
  notification: { title: string; body: string };
}

/** The toast for a due nudge towards `next`; null when no set is due or nothing is left to do. */
export function buildToastVM(next: PlanItem | null, nudge: NudgeStatus): ToastVM | null {
  if (nudge.state !== "due" || next === null) return null;
  const title = "Time to move";
  const reason = describeNudge(nudge);
  const exercise = next.exercise.name;
  return {
    title,
    reason,
    exercise,
    detail: `${next.label} · ${describeSetPosition(next)}`,
    notification: { title, body: `${exercise} — ${reason}` },
  };
}
