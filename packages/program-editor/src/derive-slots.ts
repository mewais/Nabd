import type { CycledSlot, Day, ExerciseLookup } from "@nabd/domain";
import { GROUP_PRIMARY_MUSCLE, measureOf } from "@nabd/domain";

/**
 * The cycled slots a fixed day turns into: one per muscle group it trains —
 * two where the group has both rep-counted and timed exercises, as a pool
 * holds one kind — pooling those exercises under the first one's prescription.
 */
export function deriveSlots(day: Day, lookup: ExerciseLookup, newId: () => string): CycledSlot[] {
  const slots = new Map<string, CycledSlot>();
  for (const row of day.exercises) {
    const exercise = lookup(row.exId);
    if (!exercise) continue;
    const key = `${exercise.group}:${measureOf(exercise.tracking)}`;
    let slot = slots.get(key);
    if (!slot) {
      const { repMode, intensity, rest, sets } = structuredClone(row);
      const muscle = GROUP_PRIMARY_MUSCLE[exercise.group];
      slot = { id: newId(), muscle, pool: [], repMode, intensity, rest, sets };
      slots.set(key, slot);
    }
    if (!slot.pool.includes(row.exId)) slot.pool.push(row.exId);
  }
  return [...slots.values()];
}
