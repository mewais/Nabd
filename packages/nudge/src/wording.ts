// How where nudging stands is said: in the top bar, on Today, in the toast.

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
