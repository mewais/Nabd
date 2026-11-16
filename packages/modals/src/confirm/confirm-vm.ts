/** What is about to happen, named the way the user knows it. */
export type ConfirmSubject =
  | { kind: "import" }
  | { kind: "deleteDay"; name: string }
  | { kind: "deleteExercise"; name: string };

export interface ConfirmVM {
  /** The question: "Delete Push?". */
  title: string;
  /** What saying yes does, and what it leaves alone. */
  text: string;
  confirmLabel: string;
}

const KEEPS_HISTORY = "Sets you have logged stay in your history.";

/** The question to ask before `subject` happens. */
export function buildConfirmVM(subject: ConfirmSubject): ConfirmVM {
  switch (subject.kind) {
    case "import":
      return {
        title: "Replace your data?",
        text:
          "Importing replaces your plan, your history and your settings with what the file " +
          "holds. A backup of what you have now is written next to your exports first.",
        confirmLabel: "Import",
      };
    case "deleteDay":
      return {
        title: `Delete ${subject.name}?`,
        text: `The day and everything planned on it leave your plan. ${KEEPS_HISTORY}`,
        confirmLabel: "Delete day",
      };
    case "deleteExercise":
      return {
        title: `Delete ${subject.name}?`,
        text: `It leaves the library and your plan. ${KEEPS_HISTORY}`,
        confirmLabel: "Delete exercise",
      };
  }
}
