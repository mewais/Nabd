import type { WeightUnit } from "@nabd/domain";
import { muscleNames, plural } from "@nabd/domain";
import type { PlanItem, TodayPlan } from "@nabd/scheduling";
import type { AdviceWording, Coach } from "@nabd/session";
import { describeNextSet } from "@nabd/session";
import type { NudgeStatus, NudgeSummary } from "@nabd/nudge";
import { SNOOZE_MINUTES, summarizeNudge } from "@nabd/nudge";

/** The set to do next. */
export interface NextSetVM {
  kind: "next";
  /** "Up next · Set 2 of 4" */
  kicker: string;
  exercise: string;
  label: string;
  muscleNames: string[];
  /** What the plan asks for this set; null for an unplanned extra. */
  target: string | null;
  notes: string;
  /** Null for a warm-up, which is not something to progress on. */
  advice: AdviceWording | null;
  /** Where nudging stands; while a set is due the nudge can be snoozed. */
  nudge: NudgeSummary;
  snoozeLabel: string;
}

/** Why there is no set to do. */
export interface HeroNoticeVM {
  /**
   * - `complete`: everything prescribed is logged.
   * - `skipped`: today has a plan, but every exercise in it was skipped.
   * - `rest`: the program has nothing on this day.
   * - `no-plan`: there is no program yet.
   */
  kind: "complete" | "skipped" | "rest" | "no-plan";
  title: string;
  text: string;
  /** Whether to offer logging something that is not in the plan. */
  offersLogOther: boolean;
}

export type HeroVM = NextSetVM | HeroNoticeVM;

function nextSet(item: PlanItem, coach: Coach, nudge: NudgeStatus, unit: WeightUnit): NextSetVM {
  return {
    kind: "next",
    kicker: `Up next · Set ${item.done + 1} of ${item.planned}`,
    exercise: item.exercise.name,
    label: item.label,
    muscleNames: muscleNames(item.exercise),
    ...describeNextSet(item, coach, unit),
    nudge: summarizeNudge(nudge),
    snoozeLabel: `Snooze ${SNOOZE_MINUTES}m`,
  };
}

function notice(plan: TodayPlan, hasProgram: boolean): HeroNoticeVM {
  if (plan.isComplete) {
    return {
      kind: "complete",
      title: "Day complete",
      text: `All ${plural(plan.setsDone, "set")} logged across your workday. Nice work.`,
      offersLogOther: false,
    };
  }
  if (plan.isAllSkipped) {
    return {
      kind: "skipped",
      title: "Everything skipped today",
      text: "Restore an exercise from the queue below, or log something else.",
      offersLogOther: true,
    };
  }
  if (hasProgram) {
    return {
      kind: "rest",
      title: "Rest day",
      text: "Nothing is planned for today. You can still log a set of anything.",
      offersLogOther: true,
    };
  }
  return {
    kind: "no-plan",
    title: "No plan yet",
    text: "Build your week on the Plan screen and today's sets will show up here.",
    offersLogOther: false,
  };
}

export function buildHero(input: {
  plan: TodayPlan;
  coach: Coach;
  nudge: NudgeStatus;
  unit: WeightUnit;
  hasProgram: boolean;
}): HeroVM {
  const { plan, coach, nudge, unit, hasProgram } = input;
  const item = plan.nextItem;
  return item === null ? notice(plan, hasProgram) : nextSet(item, coach, nudge, unit);
}
