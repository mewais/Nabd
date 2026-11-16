// The planner's view-model for a program, built the way the app builds it,
// over the standard catalog plans (tests/support/programs.ts).

import { MuscleVolume } from "@nabd/coverage";
import type { Program } from "@nabd/domain";
import { buildPlannerVM } from "@nabd/planner";
import type { PlannerVM } from "@nabd/planner";
import { catalogLookup } from "../support/exercises";

export const lookup = catalogLookup;

/** The planner view-model for a program, built the way the app builds it. */
export function vmOf(program: Program, plannerDayId: string | null = null): PlannerVM {
  return buildPlannerVM({
    program,
    plannerDayId,
    lookup,
    volume: MuscleVolume.ofProgram(program, lookup),
  });
}

/** The editor of a program that has days. */
export function editorOf(program: Program, plannerDayId: string | null = null) {
  const { editor } = vmOf(program, plannerDayId);
  if (!editor) throw new Error("the program has no day to edit");
  return editor;
}

/** Find a day by id, failing loudly if it is gone. */
export function dayOf(program: Program, dayId: string) {
  const day = program.days.find((d) => d.id === dayId);
  if (!day) throw new Error(`day ${dayId} not in program`);
  return day;
}

/** The set table of one exercise row or slot of a day. */
export function blockOf(program: Program, dayId: string, id: string) {
  for (const row of editorOf(program, dayId).rows) {
    if (row.kind === "slot" && row.id === id) return row.slot.block;
    const cards =
      row.kind === "exercise"
        ? [row.exercise]
        : row.kind === "superset"
          ? row.superset.members
          : [];
    const found = cards.find((exercise) => exercise.id === id);
    if (found) return found.block;
  }
  throw new Error(`no prescription ${id} in day ${dayId}`);
}
