import type {
  CycledSlot,
  Day,
  Direction,
  Exercise,
  ExerciseLookup,
  MuscleKey,
  Prescription,
  Program,
  ProgramType,
  Schedule,
  Weekday,
} from "@nabd/domain";
import { isFloating, measureOf, poolMeasure } from "@nabd/domain";
import { deriveSlots } from "./derive-slots";
import { initialPrescription } from "./defaults";
import { normalize } from "./normalize";
import { PrescriptionEditor } from "./prescription-editor";
import type { PrescriptionEdit } from "./prescription-editor";
import { removeAll, removeById, shiftById } from "./reorder";
import type { Identified } from "./reorder";
import { fitsWeekdaySchedule, pinToWeekday, reschedule } from "./schedule";
import type { PlanToday } from "./schedule";
import { moveRow, toggleSupersetOf } from "./supersets";

/** A change to the program, expressed against an editor (see {@link ProgramEditor}). */
export type ProgramEdit = (editor: ProgramEditor) => Program;

/** Points at the prescription being edited: a fixed exercise row or a cycled slot. */
export interface EditRef {
  kind: "exercise" | "slot";
  id: string;
}

/**
 * Every way the planner can change a program (a prescription's changes are
 * {@link PrescriptionEditor}'s, through {@link ProgramEditor.editPrescription}).
 * Each method makes its change to a copy and returns it, leaving the program
 * it was given untouched; whatever the change, the result obeys the program
 * rules (see normalize.ts).
 */
export class ProgramEditor {
  constructor(
    private readonly program: Program,
    private readonly newId: () => string,
    private readonly lookup: ExerciseLookup,
    private readonly today: PlanToday,
  ) {}

  // ----- Program -----

  rename(name: string): Program {
    return this.edit((draft) => Object.assign(draft, { name }));
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
   * Switch schedule, keeping today on the day it is on (see {@link reschedule});
   * going weekday is refused while the plan has more days than a week.
   */
  setSchedule(schedule: Schedule): Program {
    if (schedule === this.program.schedule) return this.program;
    if (schedule === "weekday" && !fitsWeekdaySchedule(this.program)) return this.program;
    return this.edit((draft) => reschedule(draft, schedule, this.today));
  }

  // ----- Days -----

  /** Add an empty day; a weekday schedule that is already full stays as it is. */
  addDay(weekday: Weekday | null): Program {
    const full = !isFloating(this.program) && !fitsWeekdaySchedule(this.program, 1);
    if (full) return this.program;
    return this.edit((draft) => {
      draft.days.push({ id: this.newId(), name: "New day", weekday, exercises: [], slots: [] });
    });
  }

  removeDay(dayId: string): Program {
    return this.edit((draft) => removeById(draft.days, dayId));
  }

  renameDay(dayId: string, name: string): Program {
    return this.editDay(dayId, (day) => Object.assign(day, { name }));
  }

  /** Put a day on a weekday; a day already there swaps places with it. */
  setWeekday(dayId: string, weekday: Weekday): Program {
    return this.editDay(dayId, (day, draft) => pinToWeekday(draft, day, weekday));
  }

  /** Move a day earlier (-1) or later (+1) in the floating order. */
  moveDay(dayId: string, direction: Direction): Program {
    return this.edit((draft) => shiftById(draft.days, dayId, direction));
  }

  // ----- Fixed-mode exercises -----

  addExercise(dayId: string, exId: string): Program {
    return this.withExercise(exId, (exercise) =>
      this.editDay(dayId, (day) => {
        const prescription = initialPrescription(measureOf(exercise.tracking));
        day.exercises.push({ id: this.newId(), exId: exercise.id, ...prescription });
      }),
    );
  }

  removeExercise(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => removeById(day.exercises, rowId));
  }

  /** Move an exercise earlier (-1) or later (+1) in its day, superset by superset (see {@link moveRow}). */
  moveExercise(dayId: string, rowId: string, direction: Direction): Program {
    return this.editDay(dayId, (day) => moveRow(day, rowId, direction));
  }

  /** Link an exercise with the one after it, or dissolve its superset (see {@link toggleSupersetOf}). */
  toggleSuperset(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => toggleSupersetOf(day, rowId, this.newId));
  }

  /** Remove an exercise from every day and every pool (it was deleted from the library). */
  purgeExercise(exId: string): Program {
    return this.edit((draft) => {
      for (const day of draft.days) {
        day.exercises = day.exercises.filter((e) => e.exId !== exId);
        for (const slot of day.slots) removeAll(slot.pool, exId);
      }
    });
  }

  // ----- Cycled-mode slots -----

  addSlot(dayId: string, muscle: MuscleKey): Program {
    return this.editDay(dayId, (day) => {
      day.slots.push({ id: this.newId(), muscle, pool: [], ...initialPrescription("reps") });
    });
  }

  removeSlot(dayId: string, slotId: string): Program {
    return this.editDay(dayId, (day) => removeById(day.slots, slotId));
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
    return this.withExercise(exId, (exercise) =>
      this.editSlot(dayId, slotId, (slot) => {
        const kind = poolMeasure(slot.pool, this.lookup);
        const fits = kind === null || kind === measureOf(exercise.tracking);
        if (fits && !slot.pool.includes(exId)) slot.pool.push(exId);
      }),
    );
  }

  removePoolExercise(dayId: string, slotId: string, exId: string): Program {
    return this.editSlot(dayId, slotId, (slot) => removeAll(slot.pool, exId));
  }

  // ----- Prescriptions -----

  /** Change the prescription `ref` points at (see {@link PrescriptionEditor} for the changes). */
  editPrescription(dayId: string, ref: EditRef, edit: PrescriptionEdit): Program {
    return this.editDay(dayId, (day) => {
      const list: (Prescription & Identified)[] = ref.kind === "slot" ? day.slots : day.exercises;
      const prescription = list.find((p) => p.id === ref.id);
      if (prescription) Object.assign(prescription, edit(new PrescriptionEditor(prescription)));
    });
  }

  // ----- How every change is made -----

  /** Make `change` to a copy of the program, and bring the copy in line with the rules. */
  private edit(change: (draft: Program) => void): Program {
    const draft = structuredClone(this.program);
    change(draft);
    normalize(draft, this.lookup);
    return draft;
  }

  /** Change day `dayId` of a copy; the copy unchanged when there is no such day. */
  private editDay(dayId: string, change: (day: Day, draft: Program) => void): Program {
    return this.edit((draft) => {
      const day = draft.days.find((d) => d.id === dayId);
      if (day) change(day, draft);
    });
  }

  private editSlot(dayId: string, slotId: string, change: (slot: CycledSlot) => void): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot) change(slot);
    });
  }

  /** A change that needs exercise `exId` from the library; the program itself when it has none. */
  private withExercise(exId: string, change: (exercise: Exercise) => Program): Program {
    const exercise = this.lookup(exId);
    return exercise ? change(exercise) : this.program;
  }
}
