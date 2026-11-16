// How ProgramEditor changes a program: on a copy, one day or slot of it at a
// time, which is then brought back in line with the program rules.

import type { CycledSlot, Day, Exercise, ExerciseLookup, Program } from "@nabd/domain";
import { normalize } from "./normalize";
import type { PlanToday } from "./schedule";

/**
 * The copy-on-write editing every {@link ProgramEditor} operation is written
 * with: a change is made to a copy of the program, never to the program given,
 * and the copy is normalized before it is returned.
 */
export abstract class ProgramDraft {
  constructor(
    protected readonly program: Program,
    protected readonly newId: () => string,
    protected readonly lookup: ExerciseLookup,
    protected readonly today: PlanToday,
  ) {}

  protected edit(change: (draft: Program) => void): Program {
    const draft = structuredClone(this.program);
    change(draft);
    normalize(draft, this.lookup);
    return draft;
  }

  /** Change day `dayId` of a copy; the copy unchanged when there is no such day. */
  protected editDay(dayId: string, change: (day: Day, draft: Program) => void): Program {
    return this.edit((draft) => {
      const day = draft.days.find((d) => d.id === dayId);
      if (day) change(day, draft);
    });
  }

  protected editSlot(dayId: string, slotId: string, change: (slot: CycledSlot) => void): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot) change(slot);
    });
  }

  /** A change that needs exercise `exId` from the library; the program itself when it has none. */
  protected withExercise(exId: string, change: (exercise: Exercise) => Program): Program {
    const exercise = this.lookup(exId);
    return exercise ? change(exercise) : this.program;
  }
}
