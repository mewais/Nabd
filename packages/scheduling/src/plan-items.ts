// The lines of today's queue made into plan items: each with its exercise
// looked up, what an earlier visit of the day already did, and whether it is
// skipped today.

import type { CarriedVisit, DayState, ExerciseLookup } from "@nabd/domain";
import { NO_SETS, exerciseOfSet } from "@nabd/domain";
import { PlanItem } from "./plan-item";
import type { Entry } from "./queue-entries";

/**
 * One plan item per entry. An exercise since deleted from the library is
 * shown as its sets recorded it; one with neither a library entry nor a set
 * is left out. `visit` is what earlier days of a floating day did (null on a
 * weekday plan, which has no such memory).
 */
export function planItems(
  entries: readonly Entry[],
  dayState: Pick<DayState, "skipped">,
  visit: CarriedVisit | null,
  lookup: ExerciseLookup,
): PlanItem[] {
  return entries.flatMap(({ exId, label, ...entry }) => {
    const firstSet = entry.logged[0];
    const exercise = lookup(exId) ?? (firstSet ? exerciseOfSet(firstSet) : null);
    if (!exercise) return [];
    const skipped = dayState.skipped.includes(entry.id);
    // What was done counts for the exercise it was done on, not for whatever the slot gives now.
    const earlier = visit?.items[entry.id];
    const carried = earlier?.exId === exercise.id ? earlier.sets : NO_SETS;
    return [new PlanItem({ ...entry, exercise, label: label ?? exercise.group, carried, skipped })];
  });
}
