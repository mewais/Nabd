// @nabd/scheduling — pure scheduling engine: resolve today's day, cycled
// rotation, slot building, statuses, out-of-order start, day rollover.

import type { Program, Day, Slot, Exercise, RotationState, DayState } from "@nabd/domain";
import { DEFAULTS, MUSCLE_NAMES } from "@nabd/domain";

export type ExerciseLookup = (exId: string) => Exercise | undefined;

/** Progress needed to resolve floating-day index across days. */
export interface ScheduleContext {
  rotationState: RotationState;
  floatingIndex: number;
}

/**
 * Which program Day applies on `date`. Weekday schedule -> the day whose weekday
 * matches (or null if none/rest). Floating -> days[floatingIndex % days.length].
 */
export function resolveTodayDay(program: Program, date: Date, ctx: ScheduleContext): Day | null {
  if (program.schedule === "weekday") {
    const dow = date.getDay();
    return program.days.find((d) => d.weekday === dow) ?? null;
  }
  // floating
  if (program.days.length === 0) return null;
  return program.days[ctx.floatingIndex % program.days.length];
}

/** The exercise id a cycled slot rotates to, given its rotation pointer. */
export function rotationFor(
  slotId: string,
  pool: string[],
  rotation: RotationState,
): string | null {
  if (pool.length === 0) return null;
  const pointer = rotation[slotId] ?? 0;
  return pool[pointer % pool.length];
}

/** Format minutes-from-midnight as "HH:MM". */
function minToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Count non-warmup sets; minimum 1. */
function countWorkingSets(sets: { type: string }[]): number {
  const count = sets.filter((s) => s.type !== "warmup").length;
  return Math.max(1, count);
}

/**
 * Expand a Day into today's rhythm slots (one Slot per exercise occurrence;
 * cycled slots resolve their rotated exercise). Times start at DEFAULTS.startMin
 * spaced by `intervalMin`. All slots start status "upcoming".
 */
export function buildSlots(
  day: Day,
  lookup: ExerciseLookup,
  rotation: RotationState,
  intervalMin: number,
): Slot[] {
  const slots: Slot[] = [];
  let i = 0;

  if (day.exercises.length > 0) {
    // Fixed mode: one slot per exercise prescription
    for (const presc of day.exercises) {
      const ex = lookup(presc.exId);
      if (ex === undefined) {
        i++;
        continue;
      }
      const min = DEFAULTS.startMin + i * intervalMin;
      slots.push({
        id: `${day.id}-slot-${i}`,
        exId: presc.exId,
        exercise: ex.name,
        group: ex.group,
        muscles: [...ex.primary, ...ex.secondary],
        min,
        timeStr: minToTimeStr(min),
        sets: countWorkingSets(presc.sets),
        done: 0,
        status: "upcoming",
        result: "",
      });
      i++;
    }
  } else {
    // Cycled mode: one slot per cycled slot definition
    for (const cycledSlot of day.slots) {
      const exId = rotationFor(cycledSlot.id, cycledSlot.pool, rotation);
      if (exId === null) {
        i++;
        continue;
      }
      const ex = lookup(exId);
      if (ex === undefined) {
        i++;
        continue;
      }
      const min = DEFAULTS.startMin + i * intervalMin;
      slots.push({
        id: `${day.id}-slot-${i}`,
        exId,
        exercise: ex.name,
        group: MUSCLE_NAMES[cycledSlot.muscle],
        muscles: [...ex.primary, ...ex.secondary],
        min,
        timeStr: minToTimeStr(min),
        sets: countWorkingSets(cycledSlot.sets),
        done: 0,
        status: "upcoming",
        result: "",
      });
      i++;
    }
  }

  return slots;
}

/** Apply done/now/upcoming statuses given how many leading slots are complete. */
export function applyStatuses(slots: Slot[], doneCount: number): Slot[] {
  return slots.map((slot, i) => {
    let status: Slot["status"];
    if (i < doneCount) {
      status = "done";
    } else if (i === doneCount) {
      status = "now";
    } else {
      status = "upcoming";
    }
    return { ...slot, status };
  });
}

/** Mark a specific slot as the active "now" (out-of-order start). */
export function startOutOfOrder(slots: Slot[], slotId: string): Slot[] {
  return slots.map((slot) => {
    if (slot.id === slotId) {
      return { ...slot, status: "now" };
    }
    if (slot.status === "now") {
      return { ...slot, status: "upcoming" };
    }
    return slot;
  });
}

/** The current actionable slot: first "now", else first "upcoming", else null. */
export function currentSlot(slots: Slot[]): Slot | null {
  const nowSlot = slots.find((s) => s.status === "now");
  if (nowSlot !== undefined) return nowSlot;
  return slots.find((s) => s.status === "upcoming") ?? null;
}

/** Advance cycled rotation pointers for the groups trained in `day`. */
export function advanceRotation(day: Day, rotation: RotationState): RotationState {
  const next: RotationState = {};
  for (const cycledSlot of day.slots) {
    next[cycledSlot.id] = (rotation[cycledSlot.id] ?? 0) + 1;
  }
  return next;
}

/**
 * End-of-day rollover: unfinished slots -> "skipped" (kept for history),
 * advance cycled rotation by one per trained group, advance floatingIndex if the
 * day was completed. Returns the next day's fresh DayState scaffold + new
 * rotation/floating context.
 */
export function rollover(
  program: Program,
  prev: DayState,
  ctx: ScheduleContext,
  _nextDate: Date,
): { rotationState: RotationState; floatingIndex: number; skipped: Slot[] } {
  // Collect unfinished slots as skipped
  const skipped: Slot[] = prev.slots
    .filter((s) => s.status !== "done")
    .map((s) => ({ ...s, status: "skipped" as const }));

  // Determine if all slots were completed
  const allDone = prev.slots.every((s) => s.status === "done");
  const floatingIndex = allDone ? ctx.floatingIndex + 1 : ctx.floatingIndex;

  // Advance rotation for the day that was just completed
  // Resolve the day using the current floatingIndex (before incrementing)
  const dayForRotation = program.days[ctx.floatingIndex % program.days.length];
  const rotationState = advanceRotation(dayForRotation, ctx.rotationState);

  return { rotationState, floatingIndex, skipped };
}
