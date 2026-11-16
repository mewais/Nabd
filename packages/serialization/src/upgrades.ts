// Every shape an older version stored or exported, brought to today's. Each
// upgrade returns what it was given — the same object — when there is nothing
// to do, and leaves anything it does not recognise for validation to judge.

import { isRecord } from "@nabd/domain";
import { currentExerciseId } from "@nabd/dataset";

type Json = Record<string, unknown>;

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const daysOf = (program: unknown): unknown[] => (isRecord(program) ? listOf(program.days) : []);

/** `list` with `change` applied to each element; `list` itself when no element changed. */
function mapChanged<T>(list: T[], change: (element: T) => T): T[] {
  const changed = list.map(change);
  return changed.some((element, index) => element !== list[index]) ? changed : list;
}

/** `record` with `change` applied to the list under `key`, if it has one. */
function withList(record: Json, key: string, change: (element: unknown) => unknown): Json {
  const list = record[key];
  if (!Array.isArray(list)) return record;
  const changed = mapChanged(list, change);
  return changed === list ? record : { ...record, [key]: changed };
}

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
  const unchanged = pool.length === stored.length && pool.every((id, i) => id === stored[i]);
  return unchanged ? upgraded : { ...upgraded, pool };
}

/**
 * A program as an older version wrote it: prescribed sets took their present
 * field names (`amount`, `upTo`, `intensity`) in export version 3, and an
 * exercise the catalog no longer lists gives way to the one that replaced it.
 */
function upgradeProgram(program: unknown): unknown {
  if (!isRecord(program)) return program;
  return withList(program, "days", (day) => {
    if (!isRecord(day)) return day;
    return withList(withList(day, "exercises", upgradeRow), "slots", upgradeSlot);
  });
}

/**
 * Early builds had a third theme, "translucent": the dark theme over a glass
 * window. Glass is now a switch of its own, so that is what it becomes.
 */
function upgradeSettings(settings: unknown): unknown {
  if (!isRecord(settings) || settings.theme !== "translucent") return settings;
  return { ...settings, theme: "dark", glass: true };
}

/**
 * Day state written before floating days were tracked by id holds a position
 * (`floatingIndex`) instead: turn it into the id of the day at that position
 * of `program`.
 */
function upgradeDayState(dayState: unknown, program: unknown): unknown {
  if (!isRecord(dayState) || "dayId" in dayState) return dayState;
  const { floatingIndex } = dayState;
  if (typeof floatingIndex !== "number") return dayState;
  const days = daysOf(program);
  const day = days[floatingIndex % days.length];
  return { ...dayState, dayId: isRecord(day) && typeof day.id === "string" ? day.id : null };
}

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
function upgradeRotation(rotation: unknown, program: unknown): unknown {
  if (!isRecord(rotation)) return rotation;
  const pools = poolsOf(program);
  const upgraded: Json = {};
  for (const [slotId, pointer] of Object.entries(rotation)) {
    const pool = pools.get(slotId) ?? [];
    const exId = typeof pointer === "number" ? pool[pointer % pool.length] : pointer;
    if (exId !== undefined)
      upgraded[slotId] = typeof exId === "string" ? currentExerciseId(exId) : exId;
  }
  const unchanged =
    Object.keys(upgraded).length === Object.keys(rotation).length &&
    Object.entries(upgraded).every(([slotId, exId]) => rotation[slotId] === exId);
  return unchanged ? rotation : upgraded;
}

/** The stored values an upgrade can touch, as they were read: none of them validated yet. */
interface StoredValues {
  program?: unknown;
  settings?: unknown;
  dayState?: unknown;
  rotationState?: unknown;
}

/**
 * `stored` in today's shape: every upgrade above, applied to whichever of the
 * values is present. A value that needed no upgrade is the same object as
 * before, so a caller can tell what changed.
 */
export function upgradeStored<T extends StoredValues>(stored: T): T {
  const has = (value: unknown): boolean => value !== undefined && value !== null;
  const upgraded = { ...stored };
  // Positions in the rotation and the day state refer to the program as it was stored.
  if (has(stored.rotationState)) {
    upgraded.rotationState = upgradeRotation(stored.rotationState, stored.program);
  }
  if (has(stored.dayState)) upgraded.dayState = upgradeDayState(stored.dayState, stored.program);
  if (has(stored.settings)) upgraded.settings = upgradeSettings(stored.settings);
  if (has(stored.program)) upgraded.program = upgradeProgram(stored.program);
  return upgraded;
}
