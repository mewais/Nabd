import type { DayRecord, DayState, Program, RotationState } from "@nabd/domain";
import { addDays, freshDayState, parseDateKey, startOfDay } from "@nabd/domain";
import { dayAfter } from "./floating";
import { TodayPlan, type TodayPlanInput } from "./today-plan";

export interface Rollover {
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
 *  - every cycled pool that was actually trained moves on to its next exercise;
 *  - a floating plan moves on to its next day once the ended day owes nothing.
 *    That covers a completed day, but also an empty day, a day whose pools are
 *    all empty and a day that was skipped outright — none of those can ever be
 *    "completed", so waiting for it would park the plan there forever;
 *  - skips, extras and the pause are cleared.
 */
export function rollOver(input: TodayPlanInput): Rollover {
  const { program, dayState, rotation, date } = input;
  const endedOn = parseDateKey(dayState.date);
  const ended = TodayPlan.build({ ...input, date: endedOn });

  const nextRotation = { ...rotation };
  if (program.type === "cycled") {
    for (const item of ended.items) {
      if (item.done > 0 && !item.isExtra) nextRotation[item.id] = (rotation[item.id] ?? 0) + 1;
    }
  }

  const moveOn = program.schedule === "floating" && ended.setsRemaining === 0;
  const missed = missedDays(program, endedOn, date).map(
    (day) =>
      TodayPlan.build({ ...input, rotation: nextRotation, date: day, dayState: freshDayState(day) })
        .record,
  );
  return {
    dayState: freshDayState(date, moveOn ? dayAfter(program, dayState.dayId) : dayState.dayId),
    rotation: nextRotation,
    records: [ended.record, ...missed].filter((record) => record !== null),
  };
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
