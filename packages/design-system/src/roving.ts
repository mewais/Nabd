// Keyboard movement within a group of options that is one tab stop (a radio
// group, a listbox): the arrow keys step through the options, wrapping round,
// and Home and End go to either end; options that are disabled are skipped.

const NEXT = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * The option `key` moves to from option `from`, given which options are
 * `enabled`; null for a key that moves nowhere, or when no option is enabled.
 */
export function rovingTarget(
  key: string,
  from: number,
  enabled: readonly boolean[],
): number | null {
  const count = enabled.length;
  const firstFrom = (start: number, step: 1 | -1): number | null => {
    for (let offset = 0; offset < count; offset++) {
      const index = (((start + step * offset) % count) + count) % count;
      if (enabled[index]) return index;
    }
    return null;
  };
  if (NEXT.has(key)) return firstFrom(from + 1, 1);
  if (PREVIOUS.has(key)) return firstFrom(from - 1, -1);
  if (key === "Home") return firstFrom(0, 1);
  if (key === "End") return firstFrom(count - 1, -1);
  return null;
}
