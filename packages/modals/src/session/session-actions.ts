import type { Direction } from "@nabd/domain";
import type { AdviceChoice } from "@nabd/view";

/** What the set logger asks of the app. */
export interface SessionActions {
  focusItem: (itemId: string) => void;
  stepReps: (direction: Direction) => void;
  /** Step the load by one weight increment. */
  stepWeight: (direction: Direction) => void;
  setReps: (reps: number) => void;
  /** Weight typed in the display unit. */
  setWeight: (displayValue: number) => void;
  applyAdvice: (which: AdviceChoice) => void;
  logSet: () => void;
  undoSet: (setId: string) => void;
  /** Log an exercise that is not in today's plan. */
  logOther: () => void;
  close: () => void;
}
