import type {
  Day,
  ExerciseLookup,
  Intensity,
  MuscleKey,
  Prescription,
  Program,
  ProgramType,
  RepMode,
  Schedule,
} from "@nabd/domain";
import { WEEK_ORDER, isTimeBased } from "@nabd/domain";
import { deriveSlots } from "./derive-slots";
import * as prescriptions from "./prescription-edits";

/** Points at the prescription being edited: a fixed exercise row or a cycled slot. */
export interface EditRef {
  kind: "ex" | "slot";
  id: string;
}

/** A change to the program, expressed against an editor (see {@link ProgramEditor}). */
export type ProgramEdit = (editor: ProgramEditor) => Program;

/** Days a weekday schedule has room for: one per weekday, as a further day could never come up. */
const WEEKDAY_SLOTS = WEEK_ORDER.length;

/** Move the element at `index` one place up (-1) or down (+1), if there is room. */
function shift<T>(list: T[], index: number, direction: number): void {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target]!, list[index]!];
}

/**
 * Every way the planner can change a program. Each method returns a new
 * Program and leaves the original untouched.
 */
export class ProgramEditor {
  constructor(
    private readonly program: Program,
    private readonly newId: () => string,
    private readonly lookup: ExerciseLookup,
  ) {}

  private edit(change: (draft: Program) => void): Program {
    const draft = structuredClone(this.program);
    change(draft);
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
   * Switch schedule. Going weekday gives every unplaced day a free weekday, and
   * is refused while the plan has more days than a week. Going floating puts
   * the days in the order they ran through the week, Monday first.
   */
  setSchedule(schedule: Schedule): Program {
    if (schedule === "weekday" && this.program.days.length > WEEKDAY_SLOTS) return this.program;
    return this.edit((draft) => {
      draft.schedule = schedule;
      if (schedule === "floating") {
        const weekPosition = (day: Day): number =>
          day.weekday === null ? WEEKDAY_SLOTS : WEEK_ORDER.indexOf(day.weekday);
        draft.days.sort((a, b) => weekPosition(a) - weekPosition(b));
        return;
      }
      const taken = new Set(draft.days.map((d) => d.weekday));
      const free = WEEK_ORDER.filter((wd) => !taken.has(wd));
      for (const day of draft.days) {
        if (day.weekday === null) day.weekday = free.shift() ?? null;
      }
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
        ...prescriptions.defaultPrescription(isTimeBased(exercise.tracking)),
      });
    });
  }

  removeExercise(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => {
      day.exercises = day.exercises.filter((e) => e.id !== rowId);
    });
  }

  /** Move an exercise earlier (-1) or later (+1) in its day. */
  moveExercise(dayId: string, rowId: string, direction: number): Program {
    return this.editDay(dayId, (day) => {
      shift(
        day.exercises,
        day.exercises.findIndex((e) => e.id === rowId),
        direction,
      );
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
        ...prescriptions.defaultPrescription(false),
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

  addToPool(dayId: string, slotId: string, exId: string): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot && !slot.pool.includes(exId)) slot.pool.push(exId);
    });
  }

  removeFromPool(dayId: string, slotId: string, exId: string): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot) slot.pool = slot.pool.filter((id) => id !== exId);
    });
  }

  // ----- Prescriptions (an exercise row or a cycled slot; see prescription-edits.ts) -----

  setRepMode(dayId: string, ref: EditRef, mode: RepMode): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.setRepMode(p, mode));
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

  stepVal(dayId: string, ref: EditRef, index: number, direction: number): Program {
    return this.editPrescription(dayId, ref, (p) => prescriptions.stepVal(p, index, direction));
  }

  setNotes(dayId: string, ref: EditRef, notes: string): Program {
    return this.editPrescription(dayId, ref, (p) => {
      p.notes = notes;
    });
  }
}
