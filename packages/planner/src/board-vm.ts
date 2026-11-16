// The week board: Mon–Sun for a weekday schedule, DAY 1..N plus "add" for a floating one.

import type { Day, ExerciseLookup, Program, Schedule } from "@nabd/domain";
import { MUSCLE_NAMES, WEEK_ORDER, exerciseName, weekdayName, weekdayShort } from "@nabd/domain";
import { dayOrdinal } from "./wording";

interface BoardChipVM {
  name: string;
  superset: boolean;
}

export interface DayColumnVM {
  kind: "day";
  /** "Mon" / "Day 2" */
  label: string;
  dayId: string;
  name: string;
  chips: BoardChipVM[];
  /** "+2 more" when not everything fits on the card. */
  overflow: string | null;
  /** This is the day the editor shows. */
  selected: boolean;
}

export interface RestColumnVM {
  kind: "rest";
  /** "Tue" */
  label: string;
  weekday: number;
  /** "Add a day on Tuesday" */
  addLabel: string;
}

/** One column of the board: a day's card, a free weekday, or the add tile. */
type BoardColumnVM = DayColumnVM | RestColumnVM | { kind: "add" };

export interface BoardVM {
  schedule: Schedule;
  columns: BoardColumnVM[];
}

const CHIPS_SHOWN = 4;

function dayChips(day: Day, program: Program, lookup: ExerciseLookup): BoardChipVM[] {
  if (program.type === "cycled") {
    return day.slots.map((slot) => ({ name: MUSCLE_NAMES[slot.muscle], superset: false }));
  }
  return day.exercises.map((row) => ({
    name: exerciseName(lookup, row.exId),
    superset: row.supersetId !== undefined,
  }));
}

export function buildBoardVM(
  program: Program,
  plannerDayId: string | undefined,
  lookup: ExerciseLookup,
): BoardVM {
  const dayColumn = (day: Day, label: string): DayColumnVM => {
    const chips = dayChips(day, program, lookup);
    return {
      kind: "day",
      label,
      dayId: day.id,
      name: day.name,
      chips: chips.slice(0, CHIPS_SHOWN),
      overflow: chips.length > CHIPS_SHOWN ? `+${chips.length - CHIPS_SHOWN} more` : null,
      selected: day.id === plannerDayId,
    };
  };

  if (program.schedule === "floating") {
    return {
      schedule: "floating",
      columns: [
        ...program.days.map((day, index) => dayColumn(day, dayOrdinal(index))),
        { kind: "add" },
      ],
    };
  }
  return {
    schedule: "weekday",
    columns: WEEK_ORDER.map((weekday): BoardColumnVM => {
      const label = weekdayShort(weekday);
      const day = program.days.find((d) => d.weekday === weekday);
      if (day) return dayColumn(day, label);
      return { kind: "rest", label, weekday, addLabel: `Add a day on ${weekdayName(weekday)}` };
    }),
  };
}
