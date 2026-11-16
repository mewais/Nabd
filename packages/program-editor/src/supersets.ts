// A fixed day's exercise rows as supersets: a superset stays together however
// its rows are moved, and linking or unlinking works on whole groups.

import type { Day, Direction, ExercisePrescription } from "@nabd/domain";
import { shift, shiftById } from "./reorder";

/** A day's rows as the blocks that move together: each superset, and each exercise on its own. */
function movingBlocks(rows: readonly ExercisePrescription[]): ExercisePrescription[][] {
  const blocks: ExercisePrescription[][] = [];
  for (const row of rows) {
    const last = blocks.at(-1);
    if (last && row.supersetId !== undefined && last[0]?.supersetId === row.supersetId) {
      last.push(row);
    } else {
      blocks.push([row]);
    }
  }
  return blocks;
}

/**
 * Move row `rowId` of `day` earlier (-1) or later (+1). A superset always
 * stays together:
 *  - an exercise on its own steps over a whole superset, never into it;
 *  - a superset member trades places with the partner beside it;
 *  - a member moved out past the edge of its superset leaves it (is unlinked)
 *    and stays where it is, now on its own.
 */
export function moveRow(day: Day, rowId: string, direction: Direction): void {
  const blocks = movingBlocks(day.exercises);
  const at = blocks.findIndex((block) => block.some((row) => row.id === rowId));
  const block = blocks[at];
  const row = block?.find((member) => member.id === rowId);
  if (!block || !row) return;
  const target = block.indexOf(row) + direction;
  if (block.length === 1) shift(blocks, at, direction);
  else if (target >= 0 && target < block.length) shiftById(block, rowId, direction);
  else delete row.supersetId;
  day.exercises = blocks.flat();
}

/**
 * A row already in a superset: dissolve that superset. Otherwise: link it with
 * the row after it (joining that one's superset if it has one, else under a
 * new id from `newId`).
 */
export function toggleSupersetOf(day: Day, rowId: string, newId: () => string): void {
  const index = day.exercises.findIndex((e) => e.id === rowId);
  const current = day.exercises[index];
  if (!current) return;
  if (current.supersetId !== undefined) {
    const supersetId = current.supersetId;
    for (const e of day.exercises) if (e.supersetId === supersetId) delete e.supersetId;
    return;
  }
  const next = day.exercises[index + 1];
  if (next) current.supersetId = next.supersetId ??= newId();
}
