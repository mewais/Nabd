// What stays put across a plan edit: the day a floating plan is on, the day
// the planner has open, and the exercise each cycled pool is about to give.

import type { CarriedVisit, CycledSlot, DayState, Program, RotationState } from "@nabd/domain";
import { isFloating, sameRecord, weekdayOf } from "@nabd/domain";
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

/** What today is on: the floating day, and the visit it continues. */
type Today = Pick<DayState, "dayId" | "carried">;

/**
 * The `dayId` that keeps today on the same program day across a plan edit.
 *  - A floating plan stays on its day, however the days around it change.
 *  - A weekday plan going floating starts on the day pinned to `today`'s
 *    weekday (on a rest day: null, the first day).
 *  - A weekday plan has no position to remember.
 */
function dayIdAfterEdit(
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
 * The visit `carried` after an edit that leaves the floating plan on day
 * `dayId`. A visit stays with its day: while the plan is on that day it stays
 * the same visit, in the session it began, keeping what its items still on
 * the day did — even when an edit took away all it carried, since the sets
 * logged in it since are still its own. It ends when its day does (a day that
 * took the place of a deleted one starts clean). Its day is the one the plan
 * was on; after a spell on weekdays, the one that holds its items (or, when
 * it carries nothing, the day the plan comes back to). A weekday plan does
 * not use it, but keeps it as it is for the rest of the day, so switching back
 * to floating finds it again. Returns `carried` itself when nothing changed.
 */
function carriedAfterEdit(
  before: Program,
  after: Program,
  from: Today,
  dayId: string | null,
): CarriedVisit | null {
  const { carried } = from;
  if (carried === null || !isFloating(after)) return carried;
  const day = floatingDay(after, dayId);
  const onDay = new Set(
    day === null ? [] : [...day.exercises, ...day.slots].map((item) => item.id),
  );
  const all = Object.entries(carried.items);
  const kept = all.filter(([id]) => onDay.has(id));
  const sameDay = isFloating(before)
    ? day !== null && floatingDay(before, from.dayId)?.id === day.id
    : day !== null && (kept.length > 0 || all.length === 0);
  if (!sameDay) return null;
  return kept.length === all.length ? carried : { ...carried, items: Object.fromEntries(kept) };
}

/**
 * What keeps today on the same program day across a plan edit, with what it
 * has behind it (see the two functions above). Returns `from` itself when
 * neither changed.
 */
export function todayAfterEdit(before: Program, after: Program, from: Today, today: Date): Today {
  const dayId = dayIdAfterEdit(before, after, from.dayId, today);
  const carried = carriedAfterEdit(before, after, from, dayId);
  return dayId === from.dayId && carried === from.carried ? from : { dayId, carried };
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
  const next: RotationState = {};
  for (const slot of slotsOf(after)) {
    const pointer = rotation[slot.id];
    if (pointer === undefined) continue;
    const oldPool = oldPools.get(slot.id) ?? [];
    const from = oldPool.indexOf(pointer);
    // The old pool from the pointer on, wrapping round: the first of these still there is next.
    const candidates =
      from === -1 ? [pointer] : [...oldPool.slice(from), ...oldPool.slice(0, from)];
    const exId = candidates.find((candidate) => slot.pool.includes(candidate));
    if (exId !== undefined) next[slot.id] = exId;
  }
  return sameRecord(next, rotation) ? rotation : next;
}
