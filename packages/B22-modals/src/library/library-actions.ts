import type { MuscleGroup } from "@nabd/domain";
import type { ExerciseDraftFields } from "./library-vm";

/** What the library modal can do; the store's library actions under the same names. */
export interface LibraryActions {
  closeLibrary: () => void;
  patchLibrary: (patch: { search?: string; group?: MuscleGroup | null }) => void;
  /** Add the exercise to whatever the library was opened for. */
  pickExercise: (exId: string) => void;
  /** Open the custom-exercise form, optionally pre-filled from an existing exercise. */
  startDraft: (copyOf?: string) => void;
  patchDraft: (patch: Partial<ExerciseDraftFields>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;
  deleteCustomExercise: (exId: string) => void;
}
