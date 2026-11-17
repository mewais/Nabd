// How where nudging stands is said — in the top bar, on Today, in the toast —
// and what the controls that change it say.

import type { TodayChoice } from "@nabd/domain";
import { formatClock, weekdayOf, weekdayShort } from "@nabd/domain";
import type { NudgeStatus } from "./policy";

/** When nudging resumes: "09:00" today or tomorrow, "Mon 09:00" further off. */
function resumes({ at, inDays }: { at: Date; inDays: number }): string {
  const clock = formatClock(at);
  return inDays > 1 ? `${weekdayShort(weekdayOf(at))} ${clock}` : clock;
}

/** A one-line, human description of where nudging stands. */
export function describeNudge(status: NudgeStatus): string {
  switch (status.state) {
    case "due":
      return status.reason === "idle" ? "You've gone quiet" : "Interval's up";
    case "waiting":
      return `Next nudge at ${formatClock(status.at)}, sooner if you go idle`;
    case "off_hours":
      return `Quiet until ${resumes(status)}`;
    case "skipped":
      return "Skipped today";
    case "paused":
      return "Nudges paused";
    case "nothing_left":
      return "Nothing left today";
  }
}

/** Where nudging stands, ready to show. */
export interface NudgeSummary {
  /** {@link describeNudge}'s line. */
  line: string;
  /** A set is due right now. */
  due: boolean;
}

export function summarizeNudge(status: NudgeStatus): NudgeSummary {
  return { line: describeNudge(status), due: status.state === "due" };
}

/** What the control that pauses nudges says: "Pause nudges", or "Resume nudges" while paused. */
export const pauseName = (paused: boolean): string => (paused ? "Resume nudges" : "Pause nudges");

/** What the control for each of today's choices says. */
export const TODAY_CHOICE_NAMES: Record<TodayChoice, string> = {
  skip: "Skip today",
  resume: "Resume today",
  nudge: "Nudge me today",
  stop: "Stop nudging today",
};
