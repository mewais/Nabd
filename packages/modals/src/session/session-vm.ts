import type { WeightUnit } from "@nabd/domain";
import {
  ENTERED_DECIMALS,
  editableWeight,
  formatDuration,
  isAssisted,
  isBodyweightLoaded,
  isTimeBased,
  isWeighted,
  muscleList,
  plural,
} from "@nabd/domain";
import type { PlanItem, TodayPlan } from "@nabd/scheduling";
import type { Coach, LogSession, NextSetWording } from "@nabd/session";
import { describeNextSet, formatPerformance, formatSetTally } from "@nabd/session";
import { sessionSubtitle } from "../wording";
import { COMMON_WORDS } from "@nabd/design-system";

export interface SessionListRowVM {
  itemId: string;
  exercise: string;
  /** The muscles worked, or "Skipped today". */
  detail: string;
  /** "2/4", or just "3" for an unplanned extra. */
  progress: string;
  complete: boolean;
  /** What its mark says to assistive tech: "complete"; nothing while it is not. */
  markLabel: string | undefined;
  skipped: boolean;
  active: boolean;
}

export interface LoggedSetVM {
  id: string;
  /** "Set 2". */
  label: string;
  /** What was done: "8 × 60 kg". */
  text: string;
  /** Accessible name of its delete button. */
  deleteLabel: string;
  /** The backend has not accepted it yet; it is being retried. */
  unsaved: boolean;
}

/** The set being logged. */
export interface SetFormVM {
  set: NextSetWording;
  /** "Set 2 of 4 · Working set · 8–10 reps · RPE 8": where the set sits and what the plan asks for. */
  setLine: string;
  repsLabel: string;
  reps: number;
  /** Load in the display unit, as the field holds it; null for unweighted exercises. */
  weight: number | null;
  weightLabel: string;
  /** The decimals each field holds: a number typed finer is taken rounded to them. */
  repsDecimals: number;
  weightDecimals: number;
  /** "Rest 1:20" while resting after the previous set; null otherwise. */
  restLabel: string | null;
  /** This exercise's sets logged today, oldest first. */
  logged: LoggedSetVM[];
}

export interface SessionVM {
  /**
   * Under the title: "Continuing Monday's Push — what was done then counts."
   * when an unfinished floating day came back, else what the logger is for.
   */
  subtitle: string;
  list: SessionListRowVM[];
  form: SetFormVM;
  /** How much has been logged today, across all exercises. */
  footer: string;
}

function buildListRowVM(item: PlanItem, activeId: string): SessionListRowVM {
  return {
    itemId: item.id,
    exercise: item.exercise.name,
    detail: item.skipped ? "Skipped today" : muscleList(item.exercise),
    progress: formatSetTally(item),
    complete: item.status === "done",
    markLabel: item.status === "done" ? "complete" : undefined,
    skipped: item.skipped,
    active: item.id === activeId,
  };
}

function weightLabel(item: PlanItem, unit: WeightUnit): string {
  const { tracking } = item.exercise;
  if (isAssisted(tracking)) return `Assistance (${unit})`;
  if (isBodyweightLoaded(tracking)) return `Added weight (${unit})`;
  return `Weight (${unit})`;
}

function buildLoggedSetsVM(item: PlanItem, { unit, unsaved }: SessionInput): LoggedSetVM[] {
  return item.logged.map((set, index) => ({
    id: set.id,
    label: `Set ${index + 1}`,
    text: formatPerformance({ reps: set.value, weight: set.weight }, item.exercise.tracking, unit),
    deleteLabel: `Delete set ${index + 1}`,
    unsaved: unsaved.includes(set.id),
  }));
}

function buildSetFormVM(item: PlanItem, input: SessionInput): SetFormVM {
  const { session, coach, unit, now } = input;
  const { tracking } = item.exercise;
  const set = describeNextSet(item, coach, unit);
  const rest = session.restRemaining(now);
  return {
    set,
    setLine: [set.position, set.target].filter((part) => part !== null).join(" · "),
    repsLabel: isTimeBased(tracking) ? "Sec" : COMMON_WORDS.reps,
    reps: session.reps,
    weight: isWeighted(tracking) ? editableWeight(session.weight, unit) : null,
    weightLabel: weightLabel(item, unit),
    repsDecimals: 0,
    weightDecimals: ENTERED_DECIMALS,
    restLabel: rest > 0 ? `Rest ${formatDuration(rest)}` : null,
    logged: buildLoggedSetsVM(item, input),
  };
}

interface SessionInput {
  session: LogSession;
  plan: TodayPlan;
  coach: Coach;
  unit: WeightUnit;
  now: Date;
  /** Ids of the logged sets that are not saved yet. */
  unsaved: readonly string[];
}

/** Null when the session's exercise is no longer in today's plan. */
export function buildSessionVM(input: SessionInput): SessionVM | null {
  const { session, plan } = input;
  const item = plan.item(session.itemId);
  if (!item) return null;
  return {
    subtitle: sessionSubtitle(plan),
    list: plan.items.map((other) => buildListRowVM(other, item.id)),
    form: buildSetFormVM(item, input),
    footer:
      plan.setsDone === 0
        ? "No sets logged yet today"
        : `${plural(plan.setsDone, "set")} logged today`,
  };
}
