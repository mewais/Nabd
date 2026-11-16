import type { Exercise, LoggedSet, Prescription, SetSpec } from "@nabd/domain";
import { isWarmup } from "@nabd/domain";

export type PlanItemStatus = "done" | "skipped" | "pending";

export interface PlanItemInit {
  id: string;
  exercise: Exercise;
  /** Heading shown beside the exercise: its group, or the cycled slot's target muscle. */
  label: string;
  /** Null for an unplanned extra, which has no set target. */
  prescription: Prescription | null;
  supersetId?: string;
  logged: readonly LoggedSet[];
  skipped: boolean;
}

/** One exercise in today's queue, with what is prescribed and what has been logged. */
export class PlanItem {
  readonly id: string;
  readonly exercise: Exercise;
  readonly label: string;
  readonly prescription: Prescription | null;
  readonly supersetId: string | undefined;
  readonly logged: readonly LoggedSet[];
  readonly skipped: boolean;

  constructor(init: PlanItemInit) {
    this.id = init.id;
    this.exercise = init.exercise;
    this.label = init.label;
    this.prescription = init.prescription;
    this.supersetId = init.supersetId;
    this.logged = init.logged;
    this.skipped = init.skipped;
  }

  /** True for an unplanned exercise added just for today. */
  get isExtra(): boolean {
    return this.prescription === null;
  }

  /** Prescribed set count (0 for extras, which are open-ended). */
  get planned(): number {
    return this.prescription?.sets.length ?? 0;
  }

  get done(): number {
    return this.logged.length;
  }

  /** Prescribed sets still to do; skipped items owe nothing. */
  get remaining(): number {
    return this.skipped ? 0 : Math.max(0, this.planned - this.done);
  }

  get status(): PlanItemStatus {
    if (this.skipped) return "skipped";
    return this.remaining === 0 && this.done > 0 ? "done" : "pending";
  }

  /**
   * The prescribed set that comes next, or null once the prescription is
   * exhausted. Logged sets are matched to prescribed ones by type rather than
   * by position, so the set still owed is the right one even after a set was
   * undone or the plan changed mid-day: with only the warm-up missing, the
   * warm-up is what comes next.
   */
  get nextSet(): SetSpec | null {
    if (this.prescription === null || this.done >= this.planned) return null;
    const unmatched = this.logged.map((set) => set.setType);
    const owed = this.prescription.sets.find((spec) => {
      const match = unmatched.indexOf(spec.type);
      if (match !== -1) unmatched.splice(match, 1);
      return match === -1;
    });
    return owed ?? null;
  }

  /** How many non-warm-up sets have been logged (the index progression compares on). */
  get workingSetsDone(): number {
    return this.logged.filter((set) => !isWarmup(set)).length;
  }
}
