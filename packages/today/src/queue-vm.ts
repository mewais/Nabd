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
  state: RowState;
  /** Where the row stands, in words, for assistive tech: "Up next", "To do", "Done", "Skipped". */
  stateName: string;
  /** The secondary action: skip, restore or remove the row; null when there is nothing to undo or drop. */
  skip: RowActionVM<"Skip" | "Restore" | "Remove"> | null;
  /** Null for a skipped exercise, which has to be restored first. */
  start: RowActionVM<"Start" | "More"> | null;
}

type RowState = "next" | "pending" | "done" | "skipped";

const STATE_NAMES: Record<RowState, string> = {
  next: "Up next",
  pending: "To do",
  done: "Done",
  skipped: "Skipped",
};

/** A button of a queue row. */
interface RowActionVM<Label extends string> {
  /** What it says: "Skip". */
  label: Label;
  /** Its accessible name, which says which row it acts on: "Skip Barbell Bench Press". */
  name: string;
}

/** The button `label` of `item`'s row, or none. */
function action<Label extends string>(
  label: Label | null,
  item: PlanItem,
): RowActionVM<Label> | null {
  return label === null ? null : { label, name: `${label} ${item.exercise.name}` };
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

function skipLabel(item: PlanItem): "Skip" | "Restore" | "Remove" | null {
  if (item.skipped) return "Restore";
  if (item.isExtra) return item.done === 0 ? "Remove" : null;
  return item.remaining > 0 ? "Skip" : null;
}

function startLabel(item: PlanItem): "Start" | "More" | null {
  if (item.skipped) return null;
  return item.status === "done" ? "More" : "Start";
}

export function buildQueueVM(plan: TodayPlan): QueueVM {
  const nextId = plan.nextItem?.id;
  const tags = supersetTags(plan.items);
  return {
    dayName: plan.dayName,
    rows: plan.items.map((item, index) => {
      const state = item.id === nextId ? "next" : item.status;
      return {
        id: item.id,
        marker: tags[index] ?? String(index + 1).padStart(2, "0"),
        exercise: item.exercise.name,
        sub: `${item.label} · ${muscleList(item.exercise)}`,
        badge: badge(item),
        state,
        stateName: STATE_NAMES[state],
        skip: action(skipLabel(item), item),
        start: action(startLabel(item), item),
      };
    }),
  };
}
