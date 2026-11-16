import type { Day, Program } from "@nabd/domain";

/**
 * A floating plan's current day. It is remembered by id rather than by position,
 * so adding, removing or reordering other days never changes which day is today;
 * an unknown (or not yet chosen) id means the first day.
 */
export function floatingDay(program: Program, dayId: string | null): Day | null {
  return program.days.find((d) => d.id === dayId) ?? program.days[0] ?? null;
}

/** The id of the day that follows `dayId` in program order, wrapping round. */
export function dayAfter(program: Program, dayId: string | null): string | null {
  const current = floatingDay(program, dayId);
  if (current === null) return null;
  return program.days[(program.days.indexOf(current) + 1) % program.days.length]!.id;
}

/**
 * The `dayId` that keeps a floating plan on the same day across a plan edit:
 * the current day's own id while it survives the edit, otherwise the day that
 * took its place in the order.
 */
export function dayIdAfterEdit(
  before: Program,
  after: Program,
  dayId: string | null,
): string | null {
  const current = before.schedule === "floating" ? floatingDay(before, dayId) : null;
  if (current === null) return dayId;
  if (after.days.some((d) => d.id === current.id)) return current.id;
  const position = Math.min(before.days.indexOf(current), after.days.length - 1);
  return after.days[position]?.id ?? null;
}
