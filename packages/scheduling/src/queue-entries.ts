// The lines of today's queue before their exercises are looked up: what the
// plan prescribes, what was added for the day, and what was logged beside both.

import type {
  Day,
  ExtraItem,
  LoggedSet,
  MuscleKey,
  Prescription,
  Program,
  RotationState,
} from "@nabd/domain";
import { MUSCLE_NAMES } from "@nabd/domain";
import { floatingDay } from "./floating";
import { upNext } from "./rotation";
import type { TodaysSets } from "./todays-sets";

/** Which program day applies on `date`: by weekday, or the current floating day. */
export function resolveDay(program: Program, date: Date, dayId: string | null): Day | null {
  if (program.schedule === "weekday") {
    return program.days.find((d) => d.weekday === date.getDay()) ?? null;
  }
  return floatingDay(program, dayId);
}

/** Item-id prefix for sets that count toward nothing in the plan (see {@link queueEntries}). */
const UNPLANNED = "unplanned:";

/** One line of the queue before its exercise is looked up. */
interface Entry {
  id: string;
  exId: string;
  /** Replaces the exercise's group as the heading (a cycled slot's target muscle). */
  label?: string;
  prescription: Prescription | null;
  supersetId?: string;
  logged: LoggedSet[];
}

/** The day's prescribed lines, each with the sets logged against it. */
function plannedEntries(
  program: Program,
  day: Day | null,
  rotation: RotationState,
  sets: TodaysSets,
): { entries: Entry[]; emptySlots: MuscleKey[] } {
  const entries: Entry[] = [];
  const emptySlots: MuscleKey[] = [];
  if (day === null) return { entries, emptySlots };
  if (program.type === "fixed") {
    for (const row of day.exercises) {
      const { id, exId, supersetId } = row;
      entries.push({ id, exId, supersetId, prescription: row, logged: sets.loggedAgainst(id) });
    }
    return { entries, emptySlots };
  }
  for (const slot of day.slots) {
    const logged = sets.loggedAgainst(slot.id);
    // Once trained today a slot stays on that exercise, whatever happens to its pool.
    const exId = logged[0]?.exId ?? upNext(slot, rotation);
    if (exId === null) emptySlots.push(slot.muscle);
    else {
      const label = MUSCLE_NAMES[slot.muscle];
      entries.push({ id: slot.id, exId, label, prescription: slot, logged });
    }
  }
  return { entries, emptySlots };
}

/**
 * Every line of today's queue: the planned ones, then the day's extras, then —
 * for sets that count toward none of them — one unplanned line per exercise.
 * A line with no set logged against it takes the unclaimed sets of its exercise.
 */
export function queueEntries(
  program: Program,
  day: Day | null,
  rotation: RotationState,
  extras: readonly ExtraItem[],
  sets: TodaysSets,
): { entries: Entry[]; emptySlots: MuscleKey[] } {
  const { entries, emptySlots } = plannedEntries(program, day, rotation, sets);
  for (const extra of extras) {
    entries.push({ ...extra, prescription: null, logged: sets.loggedAgainst(extra.id) });
  }
  for (const entry of entries) {
    if (entry.logged.length === 0) entry.logged = sets.ofExercise(entry.exId);
  }
  for (const exId of sets.unclaimedExercises) {
    entries.push({ id: UNPLANNED + exId, exId, prescription: null, logged: sets.ofExercise(exId) });
  }
  return { entries, emptySlots };
}
