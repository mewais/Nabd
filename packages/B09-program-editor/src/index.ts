// @nabd/program-editor — pure immutable mutations + derived views for the planner.
// Every mutation returns a new Program (input untouched). SKELETON: signatures
// frozen; bodies throw until implemented.

import type {
  Program,
  Day,
  ProgramType,
  Schedule,
  RepMode,
  Intensity,
  SetType,
  MuscleGroup,
  Exercise,
  Equipment,
  GymProfile,
} from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

export type ExerciseLookup = (exId: string) => Exercise | undefined;

/** Generate a short unique id (deterministic generator injectable for tests). */
export function newId(_seed?: number): string {
  return NI();
}

// ----- Day-level -----
export function addDay(_p: Program, _id: string, _weekday: number | null): Program {
  return NI();
}
export function removeDay(_p: Program, _dayId: string): Program {
  return NI();
}
export function renameDay(_p: Program, _dayId: string, _name: string): Program {
  return NI();
}
export function setWeekday(_p: Program, _dayId: string, _weekday: number): Program {
  return NI();
}

// ----- Program-level -----
export function setType(_p: Program, _type: ProgramType, _lookup: ExerciseLookup): Program {
  return NI();
}
export function setSchedule(_p: Program, _schedule: Schedule): Program {
  return NI();
}
export function renameProgram(_p: Program, _name: string): Program {
  return NI();
}

// ----- Fixed-mode exercises -----
export function addExercise(_p: Program, _dayId: string, _ex: Exercise): Program {
  return NI();
}
export function removeExercise(_p: Program, _dayId: string, _exRowId: string): Program {
  return NI();
}
export function toggleSuperset(_p: Program, _dayId: string, _exRowId: string): Program {
  return NI();
}

// ----- Generic prescription editing (ref = an exercise row or a cycled slot) -----
export interface EditRef {
  kind: "ex" | "slot";
  id: string;
}
export function setRepMode(_p: Program, _dayId: string, _ref: EditRef, _m: RepMode): Program {
  return NI();
}
export function setIntensity(_p: Program, _dayId: string, _ref: EditRef, _m: Intensity): Program {
  return NI();
}
export function setRest(_p: Program, _dayId: string, _ref: EditRef, _delta: number): Program {
  return NI();
}
export function addSet(_p: Program, _dayId: string, _ref: EditRef): Program {
  return NI();
}
export function addWarmup(_p: Program, _dayId: string, _ref: EditRef): Program {
  return NI();
}
export function removeSet(_p: Program, _dayId: string, _ref: EditRef, _i: number): Program {
  return NI();
}
export function cycleSetType(_p: Program, _dayId: string, _ref: EditRef, _i: number): Program {
  return NI();
}
/** Step `a` or `b` of a set by delta (time mode steps by 5). */
export function stepRep(
  _p: Program,
  _dayId: string,
  _ref: EditRef,
  _i: number,
  _which: "a" | "b",
  _delta: number,
): Program {
  return NI();
}
/** Step intensity value (RPE by 0.5 clamp 5–10; %1RM by 2.5 clamp 40–100). */
export function stepVal(_p: Program, _dayId: string, _ref: EditRef, _i: number, _delta: number): Program {
  return NI();
}
export function setNotes(_p: Program, _dayId: string, _ref: EditRef, _notes: string): Program {
  return NI();
}

// ----- Cycled-mode slots -----
export function addSlot(_p: Program, _dayId: string, _group: MuscleGroup): Program {
  return NI();
}
export function removeSlot(_p: Program, _dayId: string, _slotId: string): Program {
  return NI();
}
export function addToPool(_p: Program, _dayId: string, _slotId: string, _exId: string): Program {
  return NI();
}
export function removeFromPool(_p: Program, _dayId: string, _slotId: string, _exId: string): Program {
  return NI();
}
/** Derive cycled slots from a fixed day's exercises (group + pooled exIds). */
export function deriveSlots(_day: Day, _lookup: ExerciseLookup): Day["slots"] {
  return NI();
}

// ----- Derived views -----
export type SetTypeOrder = SetType;

export interface BoardCard {
  dayId: string;
  label: string;
  name: string;
  chips: { name: string; superset: boolean }[];
  more: number;
}
export interface BoardColumn {
  kind: "day" | "rest" | "add";
  weekday?: number;
  label: string;
  card?: BoardCard;
}
/** Week-board layout for weekday or floating schedule. */
export function boardLayout(_p: Program, _profile: GymProfile): BoardColumn[] {
  return NI();
}

/** Human summary: "5 exercises · 16 sets · ~54 min" (fixed) / "N muscle groups". */
export function daySummary(_day: Day, _type: ProgramType): string {
  return NI();
}

/** A seed Push/Pull/Legs program (used as the initial program). */
export function seedProgram(): Program {
  return NI();
}

/** Equipment available for a profile id (helper for the library filter). */
export function profileEquipment(_profile: GymProfile): Equipment[] {
  return NI();
}
