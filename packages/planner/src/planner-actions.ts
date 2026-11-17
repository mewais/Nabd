import type { MuscleKey } from "@nabd/domain";
import type { ProgramEdit } from "@nabd/program-editor";

/** What the Plan screen asks of the app. Every change to the program goes through `edit`. */
export interface PlannerActions {
  edit: (edit: ProgramEdit) => void;
  /** Show a day in the editor. */
  selectDay: (dayId: string) => void;
  /** Delete a day, once the user has confirmed. */
  removeDay: (dayId: string) => void;
  /** Open the library to add an exercise to a fixed day. */
  addExercise: (dayId: string) => void;
  /** Open the library to add an exercise to the pool of a cycled slot. */
  addPoolExercise: (dayId: string, slotId: string, muscle: MuscleKey) => void;
}
