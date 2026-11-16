// Reordering and removing the things a program lists, in place: days, exercise rows, slots.

import type { Direction } from "@nabd/domain";

/** Move the element at `index` one place earlier (-1) or later (+1), if there is room. */
export function shift<T>(list: T[], index: number, direction: Direction): void {
  const moved = list[index];
  const displaced = list[index + direction];
  if (moved === undefined || displaced === undefined) return;
  list[index] = displaced;
  list[index + direction] = moved;
}

export interface Identified {
  id: string;
}

/** Move the element called `id` one place earlier (-1) or later (+1), if there is room. */
export function shiftById<T extends Identified>(list: T[], id: string, direction: Direction): void {
  shift(
    list,
    list.findIndex((element) => element.id === id),
    direction,
  );
}

/** Remove the element called `id` from `list`, if it is there. */
export function removeById<T extends Identified>(list: T[], id: string): void {
  const index = list.findIndex((element) => element.id === id);
  if (index !== -1) list.splice(index, 1);
}

/** Remove every `value` from `list`. */
export function removeAll<T>(list: T[], value: T): void {
  list.splice(0, list.length, ...list.filter((element) => element !== value));
}
