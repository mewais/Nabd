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

/** A draft can become an exercise once it has a name and a primary muscle. */
export function isCompleteDraft(draft: Pick<ExerciseDraft, "name" | "primary">): boolean {
  return draft.name.trim() !== "" && draft.primary.length > 0;
}

/**
 * The custom exercise a draft describes, or null while it is incomplete
 * ({@link isCompleteDraft}). The first primary muscle decides the library group, and a
 * muscle picked as both primary and secondary counts as primary only.
 */
export function exerciseFromDraft(draft: ExerciseDraft, id: string): Exercise | null {
  const lead = draft.primary[0];
  if (lead === undefined || !isCompleteDraft(draft)) return null;
  return {
    id,
    name: draft.name.trim(),
    group: MUSCLE_PRIMARY_GROUP[lead],
    primary: draft.primary,
    secondary: draft.secondary.filter((muscle) => !draft.primary.includes(muscle)),
    equipment: draft.equipment,
    tracking: draft.tracking,
    custom: true,
  };
}
