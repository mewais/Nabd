import type { ExerciseLookup, Program } from "@nabd/domain";
import type { Confirmation } from "@nabd/view";
import { COMMON_WORDS } from "@nabd/design-system";

interface ConfirmInput {
  confirmation: Confirmation;
  /** Where a day being deleted gets its name. */
  program: Program;
  /** Where an exercise being deleted gets its name. */
  lookup: ExerciseLookup;
}

export interface ConfirmVM {
  /** The question: "Delete Push?". */
  title: string;
  /** What saying yes does, and what it leaves alone. */
  text: string;
  confirmLabel: string;
}

const KEEPS_HISTORY = "Sets you have logged stay in your history.";

/** The question to ask before the confirmation's action happens, naming what it acts on. */
export function buildConfirmVM({ confirmation, program, lookup }: ConfirmInput): ConfirmVM {
  switch (confirmation.kind) {
    case "import":
      return {
        title: "Replace your data?",
        text:
          "Importing replaces your plan, your history and your settings with what the file " +
          "holds. A backup of what you have now is written next to your exports first.",
        confirmLabel: "Import",
      };
    case "deleteDay": {
      const name = program.days.find((d) => d.id === confirmation.dayId)?.name ?? "this day";
      return {
        title: `Delete ${name}?`,
        text: `The day and everything planned on it leave your plan. ${KEEPS_HISTORY}`,
        confirmLabel: COMMON_WORDS.deleteDay,
      };
    }
    case "deleteExercise":
      return {
        title: `Delete ${lookup(confirmation.exId)?.name ?? "this exercise"}?`,
        text: `It leaves the library and your plan. ${KEEPS_HISTORY}`,
        confirmLabel: "Delete exercise",
      };
  }
}
