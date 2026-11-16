import type { PlanItem } from "./plan-item";
import type { TodayPlan } from "./today-plan";

/**
 * Where the logger goes after a set of `itemId` was logged. A set beyond the
 * exercise's prescription (an extra, or more of a finished exercise) was the
 * user's own choice, so the form stays there. Otherwise: the superset partner
 * that is furthest behind, else the same exercise while it owes sets, else the
 * next exercise in the queue. Null when the day is finished.
 */
export function focusAfter(
  plan: Pick<TodayPlan, "item" | "items" | "nextItem">,
  itemId: string,
): PlanItem | null {
  const current = plan.item(itemId);
  if (current && current.done > current.planned) return current;
  if (current?.supersetId !== undefined) {
    const partner = plan.items
      .filter((i) => i.supersetId === current.supersetId && i.id !== itemId && i.remaining > 0)
      .sort((a, b) => a.done - b.done)[0];
    if (partner && partner.done <= current.done) return partner;
  }
  return current && current.remaining > 0 ? current : plan.nextItem;
}
