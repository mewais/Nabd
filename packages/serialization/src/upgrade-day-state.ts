// A day state as an older version wrote it, brought to today's shape.

import type { RotationState, SetType } from "@nabd/domain";
import { SetTypeSchema, countSets, isRecord } from "@nabd/domain";
import { upNext } from "@nabd/scheduling";
import { daysOf, listOf } from "./json-lists";
import type { Json } from "./json-lists";

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
export function upgradeDayState(dayState: unknown, program: unknown, rotation: unknown): unknown {
  if (!isRecord(dayState)) return dayState;
  return upgradeCarried(upgradeFloatingIndex(dayState, program), program, rotation);
}
