// How ProgramEditor changes a program: on a copy, one day, slot or
// prescription of it at a time, which is then brought back in line with the
// program rules.

import type {
  CycledSlot,
  Day,
  Exercise,
  ExerciseLookup,
  Prescription,
  Program,
} from "@nabd/domain";
import { normalize } from "./normalize";
import { PrescriptionEditor } from "./prescription-editor";
import type { PrescriptionEdit } from "./prescription-editor";
import type { Identified } from "./reorder";
import type { PlanToday } from "./schedule";

/** Points at the prescription being edited: a fixed exercise row or a cycled slot. */
export interface EditRef {
  kind: "exercise" | "slot";
  id: string;
}

/**
 * The copy-on-write editing every {@link ProgramEditor} operation is written
 * with: a change is made to a copy of the program, never to the program given,
 * and the copy is normalized before it is returned. Changing one prescription
 * is itself such an operation, the door to {@link PrescriptionEditor}.
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

  /** Change the prescription `ref` points at (see {@link PrescriptionEditor} for the changes). */
  editPrescription(dayId: string, ref: EditRef, edit: PrescriptionEdit): Program {
    return this.editDay(dayId, (day) => {
      const list: (Prescription & Identified)[] = ref.kind === "slot" ? day.slots : day.exercises;
      const prescription = list.find((p) => p.id === ref.id);
      if (prescription) Object.assign(prescription, edit(new PrescriptionEditor(prescription)));
    });
  }

  /** A change that needs exercise `exId` from the library; the program itself when it has none. */
  protected withExercise(exId: string, change: (exercise: Exercise) => Program): Program {
    const exercise = this.lookup(exId);
    return exercise ? change(exercise) : this.program;
  }
}
