import type { AppData } from "@nabd/domain";

/** Something that cannot be undone, waiting for the user to say they mean it. */
export type Confirmation =
  /** Replace what is stored with the (already validated) contents of an import file. */
  | { kind: "import"; data: AppData }
  | { kind: "deleteDay"; dayId: string }
  | { kind: "deleteExercise"; exId: string };
