// What stays put across a plan edit: the day a floating plan is on, the day
// the planner has open, and the exercise each cycled pool is about to give.

import type { CycledSlot, Program, RotationState } from "@nabd/domain";
import { floatingDay } from "./floating";

const hasDay = (program: Program, dayId: string): boolean =>
  program.days.some((day) => day.id === dayId);

/**
 * The day that stands for `dayId` after an edit: itself while it survives,
 * otherwise the day that took its place in the order (its neighbour).
 */
function successorDay(before: Program, after: Program, dayId: string): string | null {
  if (hasDay(after, dayId)) return dayId;
  const position = before.days.findIndex((day) => day.id === dayId);
  return after.days[Math.min(position, after.days.length - 1)]?.id ?? null;
}

/**
 * The `dayId` that keeps today on the same program day across a plan edit.
 *  - A floating plan stays on its day, however the days around it change.
 *  - A weekday plan going floating starts on the day pinned to `today`'s
 *    weekday (on a rest day: null, the first day).
 *  - A weekday plan has no position to remember.
 */
export function dayIdAfterEdit(
  before: Program,
  after: Program,
  dayId: string | null,
  today: Date,
): string | null {
  if (after.schedule === "weekday") return null;
  if (before.schedule === "weekday") {
    return before.days.find((day) => day.weekday === today.getDay())?.id ?? null;
  }
  const current = floatingDay(before, dayId);
  return current === null ? dayId : successorDay(before, after, current.id);
}

/**
 * The day the planner has open after an edit: a day the edit added, else the
 * selected day while it survives, else its neighbour.
 */
export function plannerDayAfterEdit(
  before: Program,
  after: Program,
  selected: string | null,
): string | null {
  const added = after.days.find((day) => !hasDay(before, day.id));
  if (added) return added.id;
  return selected === null ? null : successorDay(before, after, selected);
}

const slotsOf = (program: Program): CycledSlot[] => program.days.flatMap((day) => day.slots);

/**
 * The rotation after a plan edit. A pool that lost the exercise it was about
 * to give moves on to the one that followed it, so removing an exercise never
 * sends the pool back to its start; entries of slots that are gone are dropped.
 * Returns `rotation` itself when nothing changed.
 */
export function rotationAfterEdit(
  before: Program,
  after: Program,
  rotation: RotationState,
): RotationState {
  const oldPools = new Map(slotsOf(before).map((slot) => [slot.id, slot.pool]));
  const entries: [string, string][] = [];
  for (const slot of slotsOf(after)) {
    const pointer = rotation[slot.id];
    if (pointer === undefined) continue;
    const oldPool = oldPools.get(slot.id) ?? [];
    const from = oldPool.indexOf(pointer);
    // The old pool from the pointer on, wrapping round: the first of these still there is next.
    const candidates =
      from === -1 ? [pointer] : [...oldPool.slice(from), ...oldPool.slice(0, from)];
    const next = candidates.find((exId) => slot.pool.includes(exId));
    if (next !== undefined) entries.push([slot.id, next]);
  }
  const unchanged =
    entries.length === Object.keys(rotation).length &&
    entries.every(([slotId, exId]) => rotation[slotId] === exId);
  return unchanged ? rotation : Object.fromEntries(entries);
}
