import type {
  Day,
  ExerciseLookup,
  ExercisePrescription,
  Intensity,
  MuscleKey,
  Prescription,
  Program,
  ProgramType,
  Schedule,
} from "@nabd/domain";
import { WEEK_ORDER, measureOf, poolMeasure } from "@nabd/domain";
import { deriveSlots } from "./derive-slots";
import { normalize } from "./normalize";
import * as prescriptions from "./prescription-edits";
import type { RepStyle } from "./prescription-edits";

/** Points at the prescription being edited: a fixed exercise row or a cycled slot. */
export interface EditRef {
  kind: "exercise" | "slot";
  id: string;
}

/** Where the plan stands today, for the edits that must not move today: switching schedule. */
export interface PlanToday {
  /** Today's weekday, 0 = Sunday. */
  weekday: number;
  /** The program day today is on; null on a rest day or in an empty plan. */
  dayId: string | null;
}

/** A change to the program, expressed against an editor (see {@link ProgramEditor}). */
export type ProgramEdit = (editor: ProgramEditor) => Program;

/** Days a weekday schedule has room for: one per weekday, as a further day could never come up. */
export const WEEKDAY_SLOTS = WEEK_ORDER.length;

/** Whether `program` could run on a weekday schedule: it has no more days than a week. */
export function fitsWeekdaySchedule(program: Pick<Program, "days">): boolean {
  return program.days.length <= WEEKDAY_SLOTS;
}

/** Move the element at `index` one place up (-1) or down (+1), if there is room. */
function shift<T>(list: T[], index: number, direction: number): void {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target]!, list[index]!];
}

/** A day's rows as the blocks that move together: each superset, and each exercise on its own. */
function movingBlocks(rows: readonly ExercisePrescription[]): ExercisePrescription[][] {
  const blocks: ExercisePrescription[][] = [];
  for (const row of rows) {
    const last = blocks.at(-1);
    if (last && row.supersetId !== undefined && last[0]?.supersetId === row.supersetId) {
      last.push(row);
    } else {
      blocks.push([row]);
    }
  }
  return blocks;
}

/**
 * Every way the planner can change a program. Each method returns a new
 * Program and leaves the original untouched; whatever the change, the result
 * obeys the program rules (see normalize.ts).
 */
export class ProgramEditor {
  constructor(
    private readonly program: Program,
    private readonly newId: () => string,
    private readonly lookup: ExerciseLookup,
    private readonly today: PlanToday,
  ) {}

  private edit(change: (draft: Program) => void): Program {
    const draft = structuredClone(this.program);
    change(draft);
    normalize(draft, this.lookup);
    return draft;
  }

  private editDay(dayId: string, change: (day: Day, draft: Program) => void): Program {
    return this.edit((draft) => {
      const day = draft.days.find((d) => d.id === dayId);
      if (day) change(day, draft);
    });
  }

  private editPrescription(
    dayId: string,
    ref: EditRef,
    change: (prescription: Prescription) => void,
  ): Program {
    return this.editDay(dayId, (day) => {
      const list: (Prescription & { id: string })[] =
        ref.kind === "slot" ? day.slots : day.exercises;
      const prescription = list.find((p) => p.id === ref.id);
      if (prescription) change(prescription);
    });
  }

  // ----- Program -----

  rename(name: string): Program {
    return this.edit((draft) => {
      draft.name = name;
    });
  }

  /** Switch plan type; going cycled derives slots for days that have none yet. */
  setType(type: ProgramType): Program {
    return this.edit((draft) => {
      draft.type = type;
      if (type !== "cycled") return;
      for (const day of draft.days) {
        if (day.slots.length === 0) day.slots = deriveSlots(day, this.lookup, this.newId);
      }
    });
  }

  /**
   * Switch schedule, keeping today on the day it is on.
   *
   * Going floating puts the days in the order they ran through the week,
   * Monday first, and unpins them. Going weekday pins the day the plan is on
   * today to today's weekday and the days after it, in plan order, to the
   * weekdays that follow; it is refused while the plan has more days than a week.
   */
  setSchedule(schedule: Schedule): Program {
    if (schedule === this.program.schedule) return this.program;
    if (schedule === "weekday" && !fitsWeekdaySchedule(this.program)) return this.program;
    return this.edit((draft) => {
      draft.schedule = schedule;
      if (schedule === "floating") {
        const weekPosition = (day: Day): number =>
          day.weekday === null ? WEEKDAY_SLOTS : WEEK_ORDER.indexOf(day.weekday);
        draft.days.sort((a, b) => weekPosition(a) - weekPosition(b));
        for (const day of draft.days) day.weekday = null;
        return;
      }
      const current = Math.max(
        0,
        draft.days.findIndex((d) => d.id === this.today.dayId),
      );
      const fromToday = [...draft.days.slice(current), ...draft.days.slice(0, current)];
      fromToday.forEach((day, daysAhead) => {
        day.weekday = (this.today.weekday + daysAhead) % WEEKDAY_SLOTS;
      });
    });
  }

  // ----- Days -----

  /** Add an empty day; a weekday schedule that is already full stays as it is. */
  addDay(weekday: number | null): Program {
    const { schedule, days } = this.program;
    if (schedule === "weekday" && days.length >= WEEKDAY_SLOTS) return this.program;
    return this.edit((draft) => {
      draft.days.push({ id: this.newId(), name: "New day", weekday, exercises: [], slots: [] });
    });
  }

  removeDay(dayId: string): Program {
    return this.edit((draft) => {
      draft.days = draft.days.filter((d) => d.id !== dayId);
    });
  }

  renameDay(dayId: string, name: string): Program {
    return this.editDay(dayId, (day) => {
      day.name = name;
    });
  }

  /** Put a day on a weekday; a day already there swaps places with it. */
  setWeekday(dayId: string, weekday: number): Program {
    return this.editDay(dayId, (day, draft) => {
      const occupant = draft.days.find((d) => d.weekday === weekday && d.id !== dayId);
      if (occupant) occupant.weekday = day.weekday;
      day.weekday = weekday;
    });
  }

  /** Move a day earlier (-1) or later (+1) in the floating order. */
  moveDay(dayId: string, direction: number): Program {
    return this.edit((draft) => {
      shift(
        draft.days,
        draft.days.findIndex((d) => d.id === dayId),
        direction,
      );
    });
  }

  // ----- Fixed-mode exercises -----

  addExercise(dayId: string, exId: string): Program {
    const exercise = this.lookup(exId);
    if (!exercise) return this.program;
    return this.editDay(dayId, (day) => {
      day.exercises.push({
        id: this.newId(),
        exId: exercise.id,
        ...prescriptions.defaultPrescription(measureOf(exercise.tracking)),
      });
    });
  }

  removeExercise(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => {
      day.exercises = day.exercises.filter((e) => e.id !== rowId);
    });
  }

  /**
   * Move an exercise earlier (-1) or later (+1) in its day. A superset always
   * stays together:
   *  - an exercise on its own steps over a whole superset, never into it;
   *  - a superset member trades places with the partner beside it;
   *  - a member moved out past the edge of its superset leaves it (is unlinked)
   *    and stays where it is, now on its own.
   */
  moveExercise(dayId: string, rowId: string, direction: number): Program {
    return this.editDay(dayId, (day) => {
      const blocks = movingBlocks(day.exercises);
      const at = blocks.findIndex((block) => block.some((row) => row.id === rowId));
      const block = blocks[at];
      if (!block) return;
      const position = block.findIndex((row) => row.id === rowId);
      const target = position + direction;
      if (block.length === 1) shift(blocks, at, direction);
      else if (target >= 0 && target < block.length) shift(block, position, direction);
      else delete block[position]!.supersetId;
      day.exercises = blocks.flat();
    });
  }

  /**
   * An exercise already in a superset: dissolve that superset. Otherwise: link it
   * with the exercise after it (joining that one's superset if it has one).
   */
  toggleSuperset(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => {
      const index = day.exercises.findIndex((e) => e.id === rowId);
      const current = day.exercises[index];
      if (!current) return;
      if (current.supersetId !== undefined) {
        const supersetId = current.supersetId;
        for (const e of day.exercises) if (e.supersetId === supersetId) delete e.supersetId;
        return;
      }
      const next = day.exercises[index + 1];
      if (next) current.supersetId = next.supersetId ??= this.newId();
    });
  }

  /** Remove an exercise from every day and every pool (it was deleted from the library). */
  purgeExercise(exId: string): Program {
    return this.edit((draft) => {
      for (const day of draft.days) {
        day.exercises = day.exercises.filter((e) => e.exId !== exId);
        for (const slot of day.slots) slot.pool = slot.pool.filter((id) => id !== exId);
      }
    });
  }

  // ----- Cycled-mode slots -----

  addSlot(dayId: string, muscle: MuscleKey): Program {
    return this.editDay(dayId, (day) => {
      day.slots.push({
        id: this.newId(),
        muscle,
        pool: [],
        ...prescriptions.defaultPrescription("reps"),
      });
    });
  }

  removeSlot(dayId: string, slotId: string): Program {
    return this.editDay(dayId, (day) => {
      day.slots = day.slots.filter((s) => s.id !== slotId);
    });
  }

  /** Move a slot earlier (-1) or later (+1) in its day. */
  moveSlot(dayId: string, slotId: string, direction: number): Program {
    return this.editDay(dayId, (day) => {
      shift(
        day.slots,
        day.slots.findIndex((s) => s.id === slotId),
        direction,
      );
    });
  }

  /**
   * Add an exercise to a slot's pool. A pool holds one kind of exercise —
   * counted in reps, or in seconds — so one of the other kind is refused; the
   * first exercise of an empty pool decides, and the slot's prescription
   * starts afresh in its measure.
   */
  addPoolExercise(dayId: string, slotId: string, exId: string): Program {
    const exercise = this.lookup(exId);
    if (!exercise) return this.program;
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (!slot || slot.pool.includes(exId)) return;
      const kind = poolMeasure(slot.pool, this.lookup);
      if (kind === null || kind === measureOf(exercise.tracking)) slot.pool.push(exId);
    });
  }

  removePoolExercise(dayId: string, slotId: string, exId: string): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot) slot.pool = slot.pool.filter((id) => id !== exId);
    });
  }

  // ----- Prescriptions (an exercise row or a cycled slot; see prescription-edits.ts) -----

  setRepStyle(dayId: string, ref: EditRef, style: RepStyle): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.setRepStyle(p, style));
  }

  setIntensity(dayId: string, ref: EditRef, mode: Intensity): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.setIntensity(p, mode));
  }

  stepRest(dayId: string, ref: EditRef, direction: number): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.stepRest(p, direction));
  }

  addSet(dayId: string, ref: EditRef): Program {
    return this.editPrescription(dayId, ref, prescriptions.addSet);
  }

  addWarmup(dayId: string, ref: EditRef): Program {
    return this.editPrescription(dayId, ref, prescriptions.addWarmup);
  }

  removeSet(dayId: string, ref: EditRef, index: number): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.removeSet(p, index));
  }

  cycleSetType(dayId: string, ref: EditRef, index: number): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.cycleSetType(p, index));
  }

  stepRep(
    dayId: string,
    ref: EditRef,
    index: number,
    which: "a" | "b",
    direction: number,
  ): Program {
    return this.editPrescription(dayId, ref, (p) =>
      prescriptions.stepRep(p, index, which, direction),
    );
  }

  stepIntensity(dayId: string, ref: EditRef, index: number, direction: number): Program {
    return this.editPrescription(dayId, ref, (p) =>
      prescriptions.stepIntensity(p, index, direction),
    );
  }

  setNotes(dayId: string, ref: EditRef, notes: string): Program {
    return this.editPrescription(dayId, ref, (p) => {
      p.notes = notes;
    });
  }
}
