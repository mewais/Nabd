import type { ExerciseDraft } from "@nabd/domain";
import type { LibraryState } from "@nabd/view";

/** What the exercise library asks of the app. */
export interface LibraryActions {
  close: () => void;
  /** Narrow the list by name, by muscle group (null for all), or both. */
  filter: (by: Partial<Pick<LibraryState, "search" | "group">>) => void;
  /** Add the exercise to whatever the library was opened for. */
  pick: (exId: string) => void;
  /** Open the custom-exercise form, optionally pre-filled from an existing exercise. */
  startDraft: (copyOf?: string) => void;
  patchDraft: (patch: Partial<ExerciseDraft>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;
  /** Delete a custom exercise, once the user has confirmed. */
  deleteCustom: (exId: string) => void;
}
