// Reordering and removing the things a program lists: days, exercise rows, slots.

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

export const without = <T extends Identified>(list: T[], id: string): T[] =>
  list.filter((element) => element.id !== id);
