// What the planner asks of the app, and the same asks bound to the thing a
// component edits, so no view handles a ProgramEditor or passes ids around.

import type { Intensity, MuscleKey, ProgramType, Schedule } from "@nabd/domain";
import type { EditRef, ProgramEdit, RepStyle } from "@nabd/program-editor";

/** What the Plan screen asks of the app. Every program change goes through `edit`. */
export interface PlannerActions {
  edit: (edit: ProgramEdit) => void;
  selectDay: (dayId: string) => void;
  /** Delete a day, once the user has confirmed. */
  removeDay: (dayId: string) => void;
  /** Open the library to add an exercise to a fixed day. */
  addExercise: (dayId: string) => void;
  /** Open the library to add an exercise to the pool of a cycled slot. */
  addPoolExercise: (dayId: string, slotId: string, muscle: MuscleKey) => void;
}

export interface ProgramActions {
  rename: (name: string) => void;
  setType: (type: ProgramType) => void;
  setSchedule: (schedule: Schedule) => void;
  /** Add a day on a weekday, or (null) at the end of a floating plan. */
  addDay: (weekday: number | null) => void;
  selectDay: (dayId: string) => void;
}

export function programActions(actions: PlannerActions): ProgramActions {
  const { edit } = actions;
  return {
    rename: (name) => edit((e) => e.rename(name)),
    setType: (type) => edit((e) => e.setType(type)),
    setSchedule: (schedule) => edit((e) => e.setSchedule(schedule)),
    addDay: (weekday) => edit((e) => e.addDay(weekday)),
    selectDay: actions.selectDay,
  };
}

export interface DayActions {
  rename: (name: string) => void;
  setWeekday: (weekday: number) => void;
  /** Earlier (-1) or later (+1) in the floating order. */
  move: (direction: number) => void;
  remove: () => void;
  addSlot: (muscle: MuscleKey) => void;
  /** Pick an exercise for this day from the library. */
  addExercise: () => void;
}

export function dayActions(actions: PlannerActions, dayId: string): DayActions {
  const { edit } = actions;
  return {
    rename: (name) => edit((e) => e.renameDay(dayId, name)),
    setWeekday: (weekday) => edit((e) => e.setWeekday(dayId, weekday)),
    move: (direction) => edit((e) => e.moveDay(dayId, direction)),
    remove: () => actions.removeDay(dayId),
    addSlot: (muscle) => edit((e) => e.addSlot(dayId, muscle)),
    addExercise: () => actions.addExercise(dayId),
  };
}

export interface ExerciseActions {
  /** Earlier (-1) or later (+1) in the day; a superset stays together (see ProgramEditor.moveExercise). */
  move: (direction: number) => void;
  remove: () => void;
  /** Link with the exercise below, or dissolve the superset it is in. */
  toggleSuperset: () => void;
}

export function exerciseActions(
  actions: PlannerActions,
  dayId: string,
  rowId: string,
): ExerciseActions {
  const { edit } = actions;
  return {
    move: (direction) => edit((e) => e.moveExercise(dayId, rowId, direction)),
    remove: () => edit((e) => e.removeExercise(dayId, rowId)),
    toggleSuperset: () => edit((e) => e.toggleSuperset(dayId, rowId)),
  };
}

export interface SlotActions {
  move: (direction: number) => void;
  remove: () => void;
  removePoolExercise: (exId: string) => void;
  /** Pick an exercise for this slot's pool from the library. */
  addPoolExercise: () => void;
}

export function slotActions(
  actions: PlannerActions,
  dayId: string,
  slot: { id: string; muscle: MuscleKey },
): SlotActions {
  const { edit } = actions;
  return {
    move: (direction) => edit((e) => e.moveSlot(dayId, slot.id, direction)),
    remove: () => edit((e) => e.removeSlot(dayId, slot.id)),
    removePoolExercise: (exId) => edit((e) => e.removePoolExercise(dayId, slot.id, exId)),
    addPoolExercise: () => actions.addPoolExercise(dayId, slot.id, slot.muscle),
  };
}

/** Edits to one prescription: an exercise row's or a cycled slot's set table. */
export interface PrescriptionActions {
  /** Write reps as a range or as a fixed number. */
  setRepStyle: (style: RepStyle) => void;
  setIntensity: (mode: Intensity) => void;
  stepRest: (direction: number) => void;
  addSet: () => void;
  addWarmup: () => void;
  setNotes: (notes: string) => void;
  removeSet: (index: number) => void;
  cycleSetType: (index: number) => void;
  /** Step a set's reps or seconds (`a`), or the top of its range (`b`). */
  stepRep: (index: number, which: "a" | "b", direction: number) => void;
  stepIntensity: (index: number, direction: number) => void;
}

export function prescriptionActions(
  actions: PlannerActions,
  dayId: string,
  ref: EditRef,
): PrescriptionActions {
  const { edit } = actions;
  return {
    setRepStyle: (style) => edit((e) => e.setRepStyle(dayId, ref, style)),
    setIntensity: (mode) => edit((e) => e.setIntensity(dayId, ref, mode)),
    stepRest: (direction) => edit((e) => e.stepRest(dayId, ref, direction)),
    addSet: () => edit((e) => e.addSet(dayId, ref)),
    addWarmup: () => edit((e) => e.addWarmup(dayId, ref)),
    setNotes: (notes) => edit((e) => e.setNotes(dayId, ref, notes)),
    removeSet: (index) => edit((e) => e.removeSet(dayId, ref, index)),
    cycleSetType: (index) => edit((e) => e.cycleSetType(dayId, ref, index)),
    stepRep: (index, which, direction) =>
      edit((e) => e.stepRep(dayId, ref, index, which, direction)),
    stepIntensity: (index, direction) => edit((e) => e.stepIntensity(dayId, ref, index, direction)),
  };
}
