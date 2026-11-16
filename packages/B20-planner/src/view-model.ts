// Pure builder: the program in, exactly what the Plan screen renders out.

import type { MuscleVolume } from "@nabd/coverage";
import type { Coverage, MuscleKey, Program, ProgramType, Schedule } from "@nabd/domain";
import { MUSCLE_NAMES, plural } from "@nabd/domain";
import type { ExerciseLookup } from "@nabd/program-editor";
import { WEEK_ORDER } from "@nabd/program-editor";
import { buildBoard } from "./board-vm";
import type { BoardVM } from "./board-vm";
import { buildEditor, resolveEditDay } from "./editor-vm";
import type { EditorVM } from "./editor-vm";

export interface ScheduleOptionVM {
  k: Schedule;
  label: string;
  disabled: boolean;
  /** Why the option cannot be picked. */
  title?: string;
}

export interface HeaderVM {
  name: string;
  type: ProgramType;
  schedule: Schedule;
  scheduleOptions: ScheduleOptionVM[];
}

export interface VolumeBarVM {
  muscle: MuscleKey;
  name: string;
  /** Share of full weekly coverage, 0–100. */
  pct: number;
  /** "9 sets" */
  value: string;
}

export interface RailVM {
  coverage: Coverage;
  /** Muscles the plan trains, most-trained first. */
  bars: VolumeBarVM[];
}

export interface PlannerVM {
  header: HeaderVM;
  board: BoardVM;
  /** Null while the plan has no days. */
  editor: EditorVM | null;
  rail: RailVM;
}

export interface PlannerInput {
  program: Program;
  /** The day picked on the board; the first day when null or gone. */
  editDayId: string | null;
  lookup: ExerciseLookup;
  /** What one pass through the program trains. */
  volume: MuscleVolume;
}

/** A weekday schedule holds one day per weekday, so a longer plan cannot switch to it. */
function scheduleOptions(program: Program): ScheduleOptionVM[] {
  const tooLong = program.schedule === "floating" && program.days.length > WEEK_ORDER.length;
  const weekdays: ScheduleOptionVM = tooLong
    ? {
        k: "weekday",
        label: "Weekdays",
        disabled: true,
        title: `A week has room for ${WEEK_ORDER.length} days; this plan has ${program.days.length}`,
      }
    : { k: "weekday", label: "Weekdays", disabled: false };
  return [weekdays, { k: "floating", label: "Floating", disabled: false }];
}

function buildRail(volume: MuscleVolume): RailVM {
  const coverage = volume.toCoverage();
  return {
    coverage,
    bars: volume.ranked().map(({ muscle, sets }) => ({
      muscle,
      name: MUSCLE_NAMES[muscle],
      pct: coverage[muscle],
      value: plural(sets, "set"),
    })),
  };
}

export function buildPlannerVM({ program, editDayId, lookup, volume }: PlannerInput): PlannerVM {
  const day = resolveEditDay(program, editDayId);
  return {
    header: {
      name: program.name,
      type: program.type,
      schedule: program.schedule,
      scheduleOptions: scheduleOptions(program),
    },
    board: buildBoard(program, day?.id, lookup),
    editor: day ? buildEditor(program, day, lookup) : null,
    rail: buildRail(volume),
  };
}
