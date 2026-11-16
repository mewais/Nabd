import type { DayRecord, DayState, RotationState } from "@nabd/domain";
import { dateKey, parseDateKey } from "@nabd/domain";
import { TodayPlan, type TodayPlanInput } from "./today-plan";

export interface Rollover {
  dayState: DayState;
  rotation: RotationState;
  /** Summary of the day that just ended; null if nothing was planned or done. */
  record: DayRecord | null;
}

/**
 * Close the day in `input.dayState` and open `input.date`:
 *  - every cycled pool that was actually trained moves on to its next exercise;
 *  - a floating plan advances to its next day only if the day was completed;
 *  - skips and extras are cleared.
 */
export function rollOver(input: TodayPlanInput): Rollover {
  const { program, dayState, rotation, date } = input;
  const ended = TodayPlan.build({ ...input, date: parseDateKey(dayState.date) });

  const nextRotation = { ...rotation };
  if (program.type === "cycled") {
    for (const item of ended.items) {
      if (item.done > 0 && !item.isExtra) nextRotation[item.id] = (rotation[item.id] ?? 0) + 1;
    }
  }

  const planned = ended.items.reduce((n, i) => n + i.planned, 0);
  return {
    dayState: {
      date: dateKey(date),
      floatingIndex: dayState.floatingIndex + (ended.isComplete ? 1 : 0),
      skipped: [],
      extras: [],
    },
    rotation: nextRotation,
    record:
      planned + ended.setsDone > 0 ? { date: dayState.date, planned, done: ended.setsDone } : null,
  };
}
