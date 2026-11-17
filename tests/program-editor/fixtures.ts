import type { Program } from "@nabd/domain";
import { EMPTY_PROGRAM } from "@nabd/domain";
import { ProgramEditor } from "@nabd/program-editor";
import type { EditRef, PlanToday, ProgramEdit } from "@nabd/program-editor";
import { exercise, lookupIn } from "../support/builders";

export const bench = exercise({ name: "Bench", group: "Chest" });
export const fly = exercise({ name: "Fly", group: "Chest" });
export const row = exercise({ name: "Row", group: "Back", primary: ["lats"] });
export const plank = exercise({
  name: "Plank",
  group: "Abs",
  primary: ["abs"],
  tracking: "duration",
});
export const crunch = exercise({ name: "Crunch", group: "Abs", primary: ["abs"] });
export const hollow = exercise({
  name: "Hollow",
  group: "Abs",
  primary: ["abs"],
  tracking: "duration",
});
export const lookup = lookupIn([bench, fly, row, plank, crunch, hollow]);

let counter = 0;

/** A Wednesday on which the plan is on no day in particular (so, on its first). */
const WEDNESDAY: PlanToday = { weekday: 3, dayId: null };

/** Apply edits in order on a day that stands as `today`, generating ids n1, n2, … that never repeat. */
export function applyOn(today: PlanToday, program: Program, ...edits: ProgramEdit[]): Program {
  return edits.reduce(
    (current, edit) => edit(new ProgramEditor(current, () => `n${++counter}`, lookup, today)),
    program,
  );
}

export const apply = (program: Program, ...edits: ProgramEdit[]): Program =>
  applyOn(WEDNESDAY, program, ...edits);

/** Types an edit where it cannot be inferred (spread into `apply`). */
export const edit = (change: ProgramEdit): ProgramEdit => change;

export const oneDay = apply(EMPTY_PROGRAM, (e) => e.addDay(1));
export const DAY = oneDay.days[0]!.id;
export const withBench = apply(oneDay, (e) => e.addExercise(DAY, bench.id));
export const BENCH: EditRef = { kind: "exercise", id: withBench.days[0]!.exercises[0]!.id };
export const sets = (p: Program, i = 0) => p.days[0]!.exercises[i]!.sets;
