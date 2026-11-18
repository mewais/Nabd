import type { Day, Program } from "@nabd/domain";

/**
 * A floating plan's current day, remembered by id (a plan edit decides whether
 * it keeps that day or its place in the order: see `todayAfterEdit`); an
 * unknown (or not yet chosen) id means the first day.
 */
export function floatingDay(program: Program, dayId: string | null): Day | null {
  return program.days.find((d) => d.id === dayId) ?? program.days[0] ?? null;
}

/** The id of the day that follows `dayId` in program order, wrapping round. */
export function dayAfter(program: Program, dayId: string | null): string | null {
  const current = floatingDay(program, dayId);
  if (current === null) return null;
  const next = program.days[(program.days.indexOf(current) + 1) % program.days.length];
  return next?.id ?? null;
}
