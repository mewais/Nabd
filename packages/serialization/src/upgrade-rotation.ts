// A rotation as an older version wrote it, brought to today's shape.

import { isRecord, sameRecord } from "@nabd/domain";
import { currentExerciseId } from "@nabd/dataset";
import { daysOf, listOf } from "./json-lists";
import type { Json } from "./json-lists";

/** The pool of every cycled slot of `program`, by slot id. */
function poolsOf(program: unknown): Map<unknown, unknown[]> {
  const pools = new Map<unknown, unknown[]>();
  for (const day of daysOf(program)) {
    for (const slot of isRecord(day) ? listOf(day.slots) : []) {
      if (isRecord(slot) && Array.isArray(slot.pool)) pools.set(slot.id, slot.pool);
    }
  }
  return pools;
}

/**
 * A rotation as an older version wrote it. Before pools were tracked by
 * exercise it held, per cycled slot, a position in the slot's pool: each
 * becomes the id of the exercise at that position of `program` (as stored
 * beside it). A slot that is gone, or whose pool is empty, loses its entry —
 * the pool then starts from its first exercise. An entry naming an exercise
 * the catalog has retired names its replacement.
 */
export function upgradeRotation(rotation: unknown, program: unknown): unknown {
  if (!isRecord(rotation)) return rotation;
  const pools = poolsOf(program);
  const upgraded: Json = {};
  for (const [slotId, pointer] of Object.entries(rotation)) {
    const pool = pools.get(slotId) ?? [];
    const exId = typeof pointer === "number" ? pool[pointer % pool.length] : pointer;
    if (exId !== undefined)
      upgraded[slotId] = typeof exId === "string" ? currentExerciseId(exId) : exId;
  }
  return sameRecord(upgraded, rotation) ? rotation : upgraded;
}
