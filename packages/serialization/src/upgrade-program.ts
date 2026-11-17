// A program as an older version wrote it, brought to today's shape.

import { isRecord, sameList } from "@nabd/domain";
import { currentExerciseId } from "@nabd/dataset";
import { withList } from "./json-lists";
import type { Json } from "./json-lists";

/** A prescribed set once called its fields `a`, `b` and `val`. */
function upgradeSet(set: unknown): unknown {
  if (!isRecord(set) || !("a" in set)) return set;
  const { a, b, val, ...rest } = set;
  return {
    ...rest,
    amount: a,
    ...(b === undefined ? {} : { upTo: b }),
    ...(val === undefined ? {} : { intensity: val }),
  };
}

const upgradeSets = (prescription: Json): Json => withList(prescription, "sets", upgradeSet);

/** An exercise row: its sets, and an exercise the catalog has since retired. */
function upgradeRow(row: unknown): unknown {
  if (!isRecord(row)) return row;
  const upgraded = upgradeSets(row);
  const exId = typeof row.exId === "string" ? currentExerciseId(row.exId) : row.exId;
  return exId === row.exId ? upgraded : { ...upgraded, exId };
}

/** A cycled slot: its sets, and retired exercises in its pool (each exercise once). */
function upgradeSlot(slot: unknown): unknown {
  if (!isRecord(slot)) return slot;
  const upgraded = upgradeSets(slot);
  const stored: unknown = slot.pool;
  if (!Array.isArray(stored)) return upgraded;
  const current = stored.map((exId: unknown) =>
    typeof exId === "string" ? currentExerciseId(exId) : exId,
  );
  const pool = [...new Set(current)];
  return sameList(pool, stored) ? upgraded : { ...upgraded, pool };
}

/**
 * A program as an older version wrote it: prescribed sets took their present
 * field names (`amount`, `upTo`, `intensity`) in export version 3, and an
 * exercise the catalog no longer lists gives way to the one that replaced it.
 */
export function upgradeProgram(program: unknown): unknown {
  if (!isRecord(program)) return program;
  return withList(program, "days", (day) => {
    if (!isRecord(day)) return day;
    return withList(withList(day, "exercises", upgradeRow), "slots", upgradeSlot);
  });
}
