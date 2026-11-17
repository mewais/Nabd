// Reading and changing stored JSON whose shape is not known yet: the lists in it,
// changed so that what needed no change stays the same object.

import { isRecord, sameList } from "@nabd/domain";

export type Json = Record<string, unknown>;

export const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export const daysOf = (program: unknown): unknown[] =>
  isRecord(program) ? listOf(program.days) : [];

/** `list` with `change` applied to each element; `list` itself when no element changed. */
function mapChanged<T>(list: T[], change: (element: T) => T): T[] {
  const changed = list.map(change);
  return sameList(changed, list) ? list : changed;
}

/** `record` with `change` applied to the list under `key`, if it has one. */
export function withList(record: Json, key: string, change: (element: unknown) => unknown): Json {
  const list = record[key];
  if (!Array.isArray(list)) return record;
  const changed = mapChanged(list, change);
  return changed === list ? record : { ...record, [key]: changed };
}
