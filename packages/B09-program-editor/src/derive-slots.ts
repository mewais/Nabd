import type { CycledSlot, Day, ExerciseLookup, MuscleGroup } from "@nabd/domain";
import { GROUP_PRIMARY_MUSCLE } from "@nabd/domain";

/**
 * The cycled slots a fixed day turns into: one per muscle group it trains,
 * pooling that group's exercises under the first one's prescription.
 */
export function deriveSlots(day: Day, lookup: ExerciseLookup, newId: () => string): CycledSlot[] {
  const byGroup = new Map<MuscleGroup, CycledSlot>();
  for (const row of day.exercises) {
    const exercise = lookup(row.exId);
    if (!exercise) continue;
    let slot = byGroup.get(exercise.group);
    if (!slot) {
      const { repMode, intensity, rest, sets } = structuredClone(row);
      const muscle = GROUP_PRIMARY_MUSCLE[exercise.group];
      slot = { id: newId(), muscle, pool: [], repMode, intensity, rest, sets };
      byGroup.set(exercise.group, slot);
    }
    if (!slot.pool.includes(row.exId)) slot.pool.push(row.exId);
  }
  return [...byGroup.values()];
}
