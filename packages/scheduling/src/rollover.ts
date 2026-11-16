import type { DayRecord, DayState, Program, RotationState } from "@nabd/domain";
import { addDays, freshDayState, parseDateKey, startOfDay } from "@nabd/domain";
import { dayAfter } from "./floating";
import { following } from "./rotation";
import { TodayPlan } from "./today-plan";
import type { TodayPlanInput } from "./today-plan";

interface Rollover {
  dayState: DayState;
  rotation: RotationState;
  /**
   * One record per planned day being closed, oldest first: the day that ended,
   * then every planned day that went by while the app was not running.
   */
  records: DayRecord[];
}

/**
 * Close the day in `input.dayState` and open `input.date`:
 *  - a floating plan moves on to its next day once the ended day owes nothing.
 *    That covers a completed day, but also an empty day, a day whose pools are
 *    all empty and a day that was skipped outright — none of those can ever be
 *    "completed", so waiting for it would park the plan there forever. A day
 *    off that nothing was logged on owes nothing only by not being a day on,
 *    so it neither moves the plan on nor counts;
 *  - a floating day that is not finished comes back with what it has behind
 *    it, counting what earlier days did: only the rest is owed;
 *  - every cycled pool that was actually trained moves on to its next exercise
 *    when its day closes — at once on a weekday plan, and on a floating plan
 *    when the plan moves on, so an unfinished day stays on the same exercises;
 *  - skips, extras and the pause are cleared.
 */
export function rollOver(input: TodayPlanInput): Rollover {
  const { program, dayState, rotation, date } = input;
  const endedOn = parseDateKey(dayState.date);
  const ended = TodayPlan.build({ ...input, date: endedOn });

  const floating = program.schedule === "floating";
  const moveOn = floating && ended.ledger.owesNothing;
  const closes = !floating || moveOn;
  const nextRotation =
    program.type === "cycled" && closes ? rotated(program, ended, rotation) : rotation;
  const missed = missedDays(program, endedOn, date).map((day) =>
    TodayPlan.build({
      ...input,
      rotation: nextRotation,
      date: day,
      dayState: freshDayState(day),
    }).ledger.record(),
  );
  return {
    dayState: moveOn
      ? freshDayState(date, dayAfter(program, dayState.dayId))
      : freshDayState(date, dayState.dayId, floating ? ended.ledger.carryOver : {}),
    rotation: nextRotation,
    records: [ended.ledger.record(moveOn), ...missed].filter((record) => record !== null),
  };
}

/**
 * The rotation after the day `ended`: every pool trained that day now points
 * at the exercise after the one it gave. A pool whose trained exercise has
 * since been removed from it keeps pointing where it does.
 */
function rotated(program: Program, ended: TodayPlan, rotation: RotationState): RotationState {
  const pools = new Map(
    program.days.flatMap((day) => day.slots).map((slot) => [slot.id, slot.pool]),
  );
  const next = { ...rotation };
  for (const item of ended.items) {
    const upcoming = item.done > 0 ? following(pools.get(item.id) ?? [], item.exercise.id) : null;
    if (upcoming !== null) next[item.id] = upcoming;
  }
  return next;
}

/**
 * The calendar days strictly between `endedOn` and `today`. Only a weekday
 * schedule can miss a day: it plans by the calendar whether or not the app is
 * running, whereas a floating plan simply waits.
 */
function missedDays(program: Program, endedOn: Date, today: Date): Date[] {
  if (program.schedule !== "weekday") return [];
  const days: Date[] = [];
  for (let day = addDays(endedOn, 1); day < startOfDay(today); day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}
