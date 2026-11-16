import { muscleList, supersetTags } from "@nabd/domain";
import type { PlanItem, TodayPlan } from "@nabd/scheduling";
import { formatSetTally } from "@nabd/session";

export interface QueueRowVM {
  id: string;
  /** The row's place in the day, "03", or its superset tag, "A2". */
  marker: string;
  exercise: string;
  /** "<label> · <muscles>" */
  sub: string;
  /** "2/4 sets", "3 sets" for extras, "Skipped". */
  badge: string;
  state: "next" | "pending" | "done" | "skipped";
  /** What the secondary action does to this row; null when there is nothing to undo or drop. */
  skipLabel: "Skip" | "Restore" | "Remove" | null;
  /** Null for a skipped exercise, which has to be restored first. */
  startLabel: "Start" | "More" | null;
}

/** Today's exercises in plan order, extras last. */
export interface QueueVM {
  /** The program day's name; null on a day without one. */
  dayName: string | null;
  rows: QueueRowVM[];
}

function badge(item: PlanItem): string {
  if (item.skipped) return "Skipped";
  const counted = item.isExtra ? item.done : item.planned;
  return `${formatSetTally(item)} ${counted === 1 ? "set" : "sets"}`;
}

function skipLabel(item: PlanItem): QueueRowVM["skipLabel"] {
  if (item.skipped) return "Restore";
  if (item.isExtra) return item.done === 0 ? "Remove" : null;
  return item.remaining > 0 ? "Skip" : null;
}

function startLabel(item: PlanItem): QueueRowVM["startLabel"] {
  if (item.skipped) return null;
  return item.status === "done" ? "More" : "Start";
}

export function buildQueueVM(plan: TodayPlan): QueueVM {
  const nextId = plan.nextItem?.id;
  const tags = supersetTags(plan.items);
  return {
    dayName: plan.dayName,
    rows: plan.items.map((item, index) => ({
      id: item.id,
      marker: tags[index] ?? String(index + 1).padStart(2, "0"),
      exercise: item.exercise.name,
      sub: `${item.label} · ${muscleList(item.exercise)}`,
      badge: badge(item),
      state: item.id === nextId ? "next" : item.status,
      skipLabel: skipLabel(item),
      startLabel: startLabel(item),
    })),
  };
}
