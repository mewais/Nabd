// What the planner asks of the app, and the same asks bound to the thing a
// component edits, so no view handles a ProgramEditor or passes ids around.

import type { Intensity, MuscleKey, ProgramType, RepMode, Schedule } from "@nabd/domain";
import type { EditRef, ProgramEdit } from "@nabd/program-editor";

/** Every program change goes through `onEdit`. */
export interface PlannerActions {
  onEdit: (edit: ProgramEdit) => void;
  onSelectDay: (dayId: string) => void;
  /** Open the library to add an exercise to a fixed day. */
  onAddExercise: (dayId: string) => void;
  /** Open the library to add an exercise to the pool of a cycled slot. */
  onAddToPool: (dayId: string, slotId: string, muscle: MuscleKey) => void;
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
  const { onEdit } = actions;
  return {
    rename: (name) => onEdit((e) => e.rename(name)),
    setType: (type) => onEdit((e) => e.setType(type)),
    setSchedule: (schedule) => onEdit((e) => e.setSchedule(schedule)),
    addDay: (weekday) => onEdit((e) => e.addDay(weekday)),
    selectDay: actions.onSelectDay,
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
  const { onEdit } = actions;
  return {
    rename: (name) => onEdit((e) => e.renameDay(dayId, name)),
    setWeekday: (weekday) => onEdit((e) => e.setWeekday(dayId, weekday)),
    move: (direction) => onEdit((e) => e.moveDay(dayId, direction)),
    remove: () => onEdit((e) => e.removeDay(dayId)),
    addSlot: (muscle) => onEdit((e) => e.addSlot(dayId, muscle)),
    addExercise: () => actions.onAddExercise(dayId),
  };
}

export interface ExerciseActions {
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
  const { onEdit } = actions;
  return {
    move: (direction) => onEdit((e) => e.moveExercise(dayId, rowId, direction)),
    remove: () => onEdit((e) => e.removeExercise(dayId, rowId)),
    toggleSuperset: () => onEdit((e) => e.toggleSuperset(dayId, rowId)),
  };
}

export interface SlotActions {
  move: (direction: number) => void;
  remove: () => void;
  removeFromPool: (exId: string) => void;
  /** Pick an exercise for this slot's pool from the library. */
  addToPool: () => void;
}

export function slotActions(
  actions: PlannerActions,
  dayId: string,
  slot: { id: string; muscle: MuscleKey },
): SlotActions {
  const { onEdit } = actions;
  return {
    move: (direction) => onEdit((e) => e.moveSlot(dayId, slot.id, direction)),
    remove: () => onEdit((e) => e.removeSlot(dayId, slot.id)),
    removeFromPool: (exId) => onEdit((e) => e.removeFromPool(dayId, slot.id, exId)),
    addToPool: () => actions.onAddToPool(dayId, slot.id, slot.muscle),
  };
}

/** Edits to one prescription: an exercise row's or a cycled slot's set table. */
export interface PrescriptionActions {
  setRepMode: (mode: RepMode) => void;
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
  const { onEdit } = actions;
  return {
    setRepMode: (mode) => onEdit((e) => e.setRepMode(dayId, ref, mode)),
    setIntensity: (mode) => onEdit((e) => e.setIntensity(dayId, ref, mode)),
    stepRest: (direction) => onEdit((e) => e.stepRest(dayId, ref, direction)),
    addSet: () => onEdit((e) => e.addSet(dayId, ref)),
    addWarmup: () => onEdit((e) => e.addWarmup(dayId, ref)),
    setNotes: (notes) => onEdit((e) => e.setNotes(dayId, ref, notes)),
    removeSet: (index) => onEdit((e) => e.removeSet(dayId, ref, index)),
    cycleSetType: (index) => onEdit((e) => e.cycleSetType(dayId, ref, index)),
    stepRep: (index, which, direction) =>
      onEdit((e) => e.stepRep(dayId, ref, index, which, direction)),
    stepIntensity: (index, direction) => onEdit((e) => e.stepVal(dayId, ref, index, direction)),
  };
}
