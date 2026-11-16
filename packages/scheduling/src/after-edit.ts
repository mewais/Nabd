// What stays put across a plan edit: the day a floating plan is on, the day
// the planner has open, and the exercise each cycled pool is about to give.

import type { CarriedVisit, CycledSlot, Program, RotationState } from "@nabd/domain";
import { isFloating, weekdayOf } from "@nabd/domain";
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
  if (!isFloating(after)) return null;
  if (!isFloating(before)) {
    return before.days.find((day) => day.weekday === weekdayOf(today))?.id ?? null;
  }
  const current = floatingDay(before, dayId);
  return current === null ? dayId : successorDay(before, after, current.id);
}

/**
 * What an unfinished floating day has behind it after an edit: the items of
 * `carried` that are still on the day `dayId` (the day after the edit) — an
 * item deleted from the plan takes its sets with it, and a day that took the
 * place of a deleted one starts clean (null: nothing behind it). A weekday
 * plan does not use it, but keeps it as it is for the rest of the day, so
 * switching back to floating finds it again. Returns `carried` itself when
 * nothing changed.
 */
export function carriedAfterEdit(
  after: Program,
  dayId: string | null,
  carried: CarriedVisit | null,
): CarriedVisit | null {
  if (carried === null || !isFloating(after)) return carried;
  const day = floatingDay(after, dayId);
  const onDay = new Set(
    day === null ? [] : [...day.exercises, ...day.slots].map((item) => item.id),
  );
  const kept = Object.entries(carried.items).filter(([id]) => onDay.has(id));
  if (kept.length === Object.keys(carried.items).length) return carried;
  return kept.length === 0 ? null : { ...carried, items: Object.fromEntries(kept) };
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
