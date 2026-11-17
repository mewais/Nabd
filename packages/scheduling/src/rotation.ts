import type { CycledSlot, RotationState } from "@nabd/domain";

/**
 * The exercise a cycled slot is on: the one its rotation points at, or the
 * pool's first when it points at nothing in the pool. Null for an empty pool.
 */
export function upNext(
  slot: Pick<CycledSlot, "id" | "pool">,
  rotation: RotationState,
): string | null {
  const pointer = rotation[slot.id];
  return pointer !== undefined && slot.pool.includes(pointer) ? pointer : (slot.pool[0] ?? null);
}

/** The pool member that follows `exId`, wrapping round; null when `exId` is not in the pool. */
export function following(pool: readonly string[], exId: string): string | null {
  const position = pool.indexOf(exId);
  return position === -1 ? null : (pool[(position + 1) % pool.length] ?? null);
}
