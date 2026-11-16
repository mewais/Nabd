import type { WeightUnit } from "@nabd/domain";
import {
  displayWeight,
  formatDuration,
  isTimeBased,
  isWeighted,
  muscleNames,
  plural,
} from "@nabd/domain";
import type { PlanItem, TodayPlan } from "@nabd/scheduling";
import type { AdviceWording, Coach, LogSession } from "@nabd/session";
import { describeNextSet, formatPerformance } from "@nabd/session";

export interface SessionListRowVM {
  itemId: string;
  exercise: string;
  /** The muscles worked, or "Skipped today". */
  detail: string;
  /** "2/4", or just "3" for an unplanned extra. */
  progress: string;
  complete: boolean;
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
}

/** The set being logged. */
export interface SetFormVM {
  exercise: string;
  /** "Set 2 of 4 · 8–10 reps @ RPE 8": where the set sits and what the plan asks for. */
  setLine: string;
  notes: string;
  muscleNames: string[];
  /** Null for a warm-up, which is not something to progress on. */
  advice: AdviceWording | null;
  repsLabel: "Reps" | "Sec";
  reps: number;
  /** Load in the display unit; null for unweighted exercises. */
  weight: number | null;
  weightLabel: string;
  /** "Rest 1:20" while resting after the previous set; null otherwise. */
  restLabel: string | null;
  /** This exercise's sets logged today, oldest first. */
  logged: LoggedSetVM[];
}

export interface SessionVM {
  list: SessionListRowVM[];
  form: SetFormVM;
  /** How much has been logged today, across all exercises. */
  footer: string;
}

function listRow(item: PlanItem, activeId: string): SessionListRowVM {
  return {
    itemId: item.id,
    exercise: item.exercise.name,
    detail: item.skipped ? "Skipped today" : muscleNames(item.exercise).join(", "),
    progress: item.isExtra ? String(item.done) : `${item.done}/${item.planned}`,
    complete: item.status === "done",
    skipped: item.skipped,
    active: item.id === activeId,
  };
}

function setLabel(item: PlanItem): string {
  if (item.isExtra) return `Set ${item.done + 1}`;
  if (item.remaining === 0) return `All ${plural(item.planned, "set")} done — extra set`;
  return `Set ${item.done + 1} of ${item.planned}`;
}

function weightLabel(item: PlanItem, unit: WeightUnit): string {
  if (item.exercise.tracking === "assisted_bodyweight") return `Assistance (${unit})`;
  if (item.exercise.tracking === "weighted_bodyweight") return `Added weight (${unit})`;
  return `Weight (${unit})`;
}

function loggedSets(item: PlanItem, unit: WeightUnit): LoggedSetVM[] {
  return item.logged.map((set, index) => ({
    id: set.id,
    label: `Set ${index + 1}`,
    text: formatPerformance({ reps: set.value, weight: set.weight }, item.exercise.tracking, unit),
    deleteLabel: `Delete set ${index + 1}`,
  }));
}

function setForm(item: PlanItem, input: SessionInput): SetFormVM {
  const { session, coach, unit, now } = input;
  const { tracking } = item.exercise;
  const { target, notes, advice } = describeNextSet(item, coach, unit);
  const rest = session.restRemaining(now);
  return {
    exercise: item.exercise.name,
    setLine: [setLabel(item), target].filter((part) => part !== null).join(" · "),
    notes,
    muscleNames: muscleNames(item.exercise),
    advice,
    repsLabel: isTimeBased(tracking) ? "Sec" : "Reps",
    reps: session.reps,
    weight: isWeighted(tracking) ? displayWeight(session.weight, unit) : null,
    weightLabel: weightLabel(item, unit),
    restLabel: rest > 0 ? `Rest ${formatDuration(rest)}` : null,
    logged: loggedSets(item, unit),
  };
}

export interface SessionInput {
  session: LogSession;
  plan: TodayPlan;
  coach: Coach;
  unit: WeightUnit;
  now: Date;
}

/** Null when the session's exercise is no longer in today's plan. */
export function buildSessionVM(input: SessionInput): SessionVM | null {
  const { session, plan } = input;
  const item = plan.item(session.itemId);
  if (!item) return null;
  return {
    list: plan.items.map((other) => listRow(other, item.id)),
    form: setForm(item, input),
    footer:
      plan.setsDone === 0
        ? "No sets logged yet today"
        : `${plural(plan.setsDone, "set")} logged today`,
  };
}
