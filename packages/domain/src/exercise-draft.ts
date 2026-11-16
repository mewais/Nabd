import type { Exercise } from "./exercise";
import { MUSCLE_PRIMARY_GROUP } from "./muscles";

/** A custom exercise being written: what the user fills in, before it has an id or a group. */
export type ExerciseDraft = Pick<
  Exercise,
  "name" | "primary" | "secondary" | "equipment" | "tracking"
>;

export const EMPTY_DRAFT: ExerciseDraft = {
  name: "",
  primary: [],
  secondary: [],
  equipment: "bodyweight",
  tracking: "weight_reps",
};

/** A draft that starts as a copy of `source`. */
export function draftCopyOf(source: Exercise): ExerciseDraft {
  return {
    name: `${source.name} (copy)`,
    primary: [...source.primary],
    secondary: [...source.secondary],
    equipment: source.equipment,
    tracking: source.tracking,
  };
}

/**
 * The custom exercise a draft describes, or null while it lacks a name or a
 * primary muscle. The first primary muscle decides the library group, and a
 * muscle picked as both primary and secondary counts as primary only.
 */
export function exerciseFromDraft(draft: ExerciseDraft, id: string): Exercise | null {
  const name = draft.name.trim();
  const lead = draft.primary[0];
  if (lead === undefined || name === "") return null;
  return {
    id,
    name,
    group: MUSCLE_PRIMARY_GROUP[lead],
    primary: draft.primary,
    secondary: draft.secondary.filter((muscle) => !draft.primary.includes(muscle)),
    equipment: draft.equipment,
    tracking: draft.tracking,
    custom: true,
  };
}
