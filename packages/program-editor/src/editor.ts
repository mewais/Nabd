import type {
  Day,
  Direction,
  ExerciseLookup,
  MuscleKey,
  Prescription,
  Program,
  ProgramType,
  Schedule,
} from "@nabd/domain";
import { WEEK_ORDER, inWeekOrder, measureOf, poolMeasure } from "@nabd/domain";
import { deriveSlots } from "./derive-slots";
import { normalize } from "./normalize";
import { PrescriptionEditor } from "./prescription-editor";
import { movingBlocks, shift, shiftById, without } from "./reorder";
import type { Identified } from "./reorder";
import type { PrescriptionEdit } from "./prescription-editor";

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

/**
 * Whether `program` could run on a weekday schedule — with `added` more days,
 * if any: it would have no more days than a week.
 */
export function fitsWeekdaySchedule(program: Pick<Program, "days">, added = 0): boolean {
  return program.days.length + added <= WEEKDAY_SLOTS;
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

  /** Change the prescription `ref` points at (see {@link PrescriptionEditor} for the changes). */
  editPrescription(dayId: string, ref: EditRef, edit: PrescriptionEdit): Program {
    return this.editDay(dayId, (day) => {
      const list: (Prescription & Identified)[] = ref.kind === "slot" ? day.slots : day.exercises;
      const prescription = list.find((p) => p.id === ref.id);
      if (prescription) edit(new PrescriptionEditor(prescription));
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
        draft.days = inWeekOrder(draft.days);
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
    const full = this.program.schedule === "weekday" && !fitsWeekdaySchedule(this.program, 1);
    if (full) return this.program;
    return this.edit((draft) => {
      draft.days.push({ id: this.newId(), name: "New day", weekday, exercises: [], slots: [] });
    });
  }

  removeDay(dayId: string): Program {
    return this.edit((draft) => {
      draft.days = without(draft.days, dayId);
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
  moveDay(dayId: string, direction: Direction): Program {
    return this.edit((draft) => shiftById(draft.days, dayId, direction));
  }

  // ----- Fixed-mode exercises -----

  addExercise(dayId: string, exId: string): Program {
    const exercise = this.lookup(exId);
    if (!exercise) return this.program;
    return this.editDay(dayId, (day) => {
      day.exercises.push({
        id: this.newId(),
        exId: exercise.id,
        ...PrescriptionEditor.initial(measureOf(exercise.tracking)),
      });
    });
  }

  removeExercise(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => {
      day.exercises = without(day.exercises, rowId);
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
  moveExercise(dayId: string, rowId: string, direction: Direction): Program {
    return this.editDay(dayId, (day) => {
      const blocks = movingBlocks(day.exercises);
      const at = blocks.findIndex((block) => block.some((row) => row.id === rowId));
      const block = blocks[at];
      const row = block?.find((member) => member.id === rowId);
      if (!block || !row) return;
      const target = block.indexOf(row) + direction;
      if (block.length === 1) shift(blocks, at, direction);
      else if (target >= 0 && target < block.length) shiftById(block, rowId, direction);
      else delete row.supersetId;
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
      day.slots.push({ id: this.newId(), muscle, pool: [], ...PrescriptionEditor.initial("reps") });
    });
  }

  removeSlot(dayId: string, slotId: string): Program {
    return this.editDay(dayId, (day) => {
      day.slots = without(day.slots, slotId);
    });
  }

  /** Move a slot earlier (-1) or later (+1) in its day. */
  moveSlot(dayId: string, slotId: string, direction: Direction): Program {
    return this.editDay(dayId, (day) => shiftById(day.slots, slotId, direction));
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
}
