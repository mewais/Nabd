import type { ExerciseDraft, MuscleGroup } from "@nabd/domain";

/** What the exercise library asks of the app. */
export interface LibraryActions {
  close: () => void;
  /** Narrow the list by name, by muscle group (null for all), or both. */
  filter: (by: { search?: string; group?: MuscleGroup | null }) => void;
  /** Add the exercise to whatever the library was opened for. */
  pick: (exId: string) => void;
  /** Open the custom-exercise form, optionally pre-filled from an existing exercise. */
  startDraft: (copyOf?: string) => void;
  patchDraft: (patch: Partial<ExerciseDraft>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;
  deleteCustom: (exId: string) => void;
}
