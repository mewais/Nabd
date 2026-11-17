import type { ExerciseDraft, MuscleGroup, MuscleKey } from "@nabd/domain";

/** What picking an exercise in the library does. */
export type LibraryTarget =
  /** Add it to a fixed day. */
  | { kind: "exercise"; dayId: string }
  /** Add it to a cycled slot's pool. */
  | { kind: "pool"; dayId: string; slotId: string; muscle: MuscleKey }
  /** Do it today, outside the plan. */
  | { kind: "extra" };

/** The exercise library as the user has it open; `target` null means it is closed. */
export interface LibraryState {
  target: LibraryTarget | null;
  search: string;
  group: MuscleGroup | null;
  /** The custom-exercise form, when it is showing. */
  draft: ExerciseDraft | null;
}
