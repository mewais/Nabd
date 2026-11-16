// Every shape an older version stored or exported, brought to today's. Each
// upgrade returns what it was given — the same object — when there is nothing
// to do, and leaves anything it does not recognise for validation to judge.

import type { RotationState, SetType } from "@nabd/domain";
import { SetTypeSchema, countSets, isRecord } from "@nabd/domain";
import { currentExerciseId } from "@nabd/dataset";
import { upNext } from "@nabd/scheduling";

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
function upgradeFloatingIndex(dayState: Json, program: unknown): Json {
  if ("dayId" in dayState) return dayState;
  const { floatingIndex } = dayState;
  if (typeof floatingIndex !== "number") return dayState;
  const days = daysOf(program);
  const day = days[floatingIndex % days.length];
  return { ...dayState, dayId: isRecord(day) && typeof day.id === "string" ? day.id : null };
}

/** The fixed row or cycled slot of `program` with the id `itemId`. */
function prescribedItem(program: unknown, itemId: string): Json | undefined {
  for (const day of daysOf(program)) {
    if (!isRecord(day)) continue;
    const items = [...listOf(day.exercises), ...listOf(day.slots)].filter(isRecord);
    const item = items.find((candidate) => candidate.id === itemId);
    if (item) return item;
  }
  return undefined;
}

const strings = (list: unknown[]): string[] =>
  list.filter((value): value is string => typeof value === "string");

/** The exercise a row or slot is on: the row's own, or the one its slot's rotation points at. */
function exerciseOf(item: Json, rotation: RotationState): string | null {
  if (typeof item.exId === "string") return item.exId;
  if (typeof item.id !== "string") return null;
  return upNext({ id: item.id, pool: strings(listOf(item.pool)) }, rotation);
}

/** The kinds of the first `count` sets `item` prescribes. */
function firstSetTypes(item: Json, count: number): SetType[] {
  return listOf(item.sets)
    .slice(0, count)
    .flatMap((set) => {
      const type = SetTypeSchema.safeParse(isRecord(set) ? set.type : undefined);
      return type.success ? [type.data] : [];
    });
}

/**
 * Before carried sets knew their kind and their exercise, the day state held,
 * per plan item, how many of its first prescribed sets an unfinished floating
 * day had done (export version 4). Each count becomes the kinds of those
 * sets, of the exercise the item is on in `program` and `rotation`, and the
 * visit is taken to have begun on the day state's own date. A count of an
 * item that is gone is dropped; nothing carried at all is no visit.
 */
function upgradeCarried(dayState: Json, program: unknown, rotation: unknown): Json {
  const { carried } = dayState;
  if (!isRecord(carried) || "items" in carried) return dayState;
  const pointers: RotationState = {};
  for (const [slotId, exId] of Object.entries(isRecord(rotation) ? rotation : {})) {
    if (typeof exId === "string") pointers[slotId] = exId;
  }
  const items: Json = {};
  for (const [itemId, count] of Object.entries(carried)) {
    const item = prescribedItem(program, itemId);
    const exId = item && exerciseOf(item, pointers);
    if (typeof count !== "number" || !item || !exId) continue;
    items[itemId] = { exId, sets: countSets(firstSetTypes(item, count)) };
  }
  const visit = Object.keys(items).length === 0 ? null : { startedOn: dayState.date, items };
  return { ...dayState, carried: visit };
}

/** A day state as an older version wrote it, read against `program` and `rotation` as upgraded. */
function upgradeDayState(dayState: unknown, program: unknown, rotation: unknown): unknown {
  if (!isRecord(dayState)) return dayState;
  return upgradeCarried(upgradeFloatingIndex(dayState, program), program, rotation);
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
  // Positions in the rotation refer to the program as it was stored; the day state is read
  // against both as upgraded (upgrading a program never moves its days or sets).
  if (has(stored.rotationState)) {
    upgraded.rotationState = upgradeRotation(stored.rotationState, stored.program);
  }
  if (has(stored.settings)) upgraded.settings = upgradeSettings(stored.settings);
  if (has(stored.program)) upgraded.program = upgradeProgram(stored.program);
  if (has(stored.dayState)) {
    upgraded.dayState = upgradeDayState(stored.dayState, upgraded.program, upgraded.rotationState);
  }
  return upgraded;
}
