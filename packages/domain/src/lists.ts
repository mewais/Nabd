/** `list` with `item` added if it was missing, removed if it was there. */
export function toggled<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((other) => other !== item) : [...list, item];
}

/** Whether two lists hold the same elements, in the same order. */
export function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((element, index) => element === b[index]);
}

/** Whether two records hold the same values under the same keys. */
export function sameRecord<T>(a: Record<string, T>, b: Record<string, T>): boolean {
  const entries = Object.entries(a);
  return entries.length === Object.keys(b).length && entries.every(([key, v]) => b[key] === v);
}
