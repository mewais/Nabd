import type { Exercise, LoggedSet, Prescription, SetSpec } from "@nabd/domain";
import { isWarmup, workingSets } from "@nabd/domain";

type PlanItemStatus = "done" | "skipped" | "pending";

/** What a plan item is made from: its own fields (see {@link PlanItem}). */
type PlanItemInit = Pick<
  PlanItem,
  "id" | "exercise" | "label" | "prescription" | "supersetId" | "logged" | "carried" | "skipped"
>;

/** One exercise in today's queue, with what is prescribed and what has been logged. */
export class PlanItem {
  declare readonly id: string;
  declare readonly exercise: Exercise;
  /** Heading shown beside the exercise: its group, or the cycled slot's target muscle. */
  declare readonly label: string;
  /** Null for an unplanned extra, which has no set target. */
  declare readonly prescription: Prescription | null;
  declare readonly supersetId?: string | undefined;
  /** The sets logged today. */
  declare readonly logged: readonly LoggedSet[];
  /** How many of the first prescribed sets were already done on earlier days of this floating day. */
  declare readonly carried: number;
  declare readonly skipped: boolean;

  constructor(init: PlanItemInit) {
    Object.assign(this, init);
  }

  /** True for an unplanned exercise added just for today. */
  get isExtra(): boolean {
    return this.prescription === null;
  }

  /** Prescribed set count (0 for extras, which are open-ended). */
  get planned(): number {
    return this.prescription?.sets.length ?? 0;
  }

  /** Prescribed sets this calendar day owes: what earlier days left (0 for extras). */
  get owed(): number {
    return Math.max(0, this.planned - this.carried);
  }

  /** Sets done toward the prescription: those carried from earlier days and today's. */
  get done(): number {
    return this.carried + this.logged.length;
  }

  /** Prescribed sets done, as many as there are: what a day that comes back starts from. */
  get completed(): number {
    return Math.min(this.done, this.planned);
  }

  /** Prescribed sets still to do; skipped items owe nothing. */
  get remaining(): number {
    return this.skipped ? 0 : Math.max(0, this.planned - this.done);
  }

  get status(): PlanItemStatus {
    if (this.skipped) return "skipped";
    return this.remaining === 0 && this.done > 0 ? "done" : "pending";
  }

  /** The prescribed sets that earlier days already did. */
  private get carriedSets(): SetSpec[] {
    return this.prescription?.sets.slice(0, this.carried) ?? [];
  }

  /**
   * The prescribed set that comes next, or null once the prescription is
   * exhausted. Past the sets earlier days did, today's logged sets are matched
   * to prescribed ones by type rather than by position, so the set still owed
   * is the right one even after a set was undone or the plan changed mid-day:
   * with only the warm-up missing, the warm-up is what comes next.
   */
  get nextSet(): SetSpec | null {
    if (this.prescription === null || this.done >= this.planned) return null;
    const unmatched = this.logged.map((set) => set.setType);
    const owed = this.prescription.sets.slice(this.carried).find((spec) => {
      const match = unmatched.indexOf(spec.type);
      if (match !== -1) unmatched.splice(match, 1);
      return match === -1;
    });
    return owed ?? null;
  }

  /** How many non-warm-up sets have been done (the index progression compares on). */
  get workingSetsDone(): number {
    return (
      workingSets({ sets: this.carriedSets }).length +
      this.logged.filter((set) => !isWarmup(set)).length
    );
  }

  /** Load moved so far, in kg: reps × weight over the logged sets, warm-ups left out. */
  get loadLifted(): number {
    return this.logged
      .filter((set) => !isWarmup(set))
      .reduce((total, set) => total + set.value * (set.weight ?? 0), 0);
  }
}
