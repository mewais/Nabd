import type { Exercise, LoggedSet, Prescription, SetCounts, SetSpec, SetType } from "@nabd/domain";
import { NO_SETS, SET_TYPES, countSets, isWarmup, sum, totalSets } from "@nabd/domain";

type PlanItemStatus = "done" | "skipped" | "pending";

/** What a plan item is made from: its own fields (see {@link PlanItem}). */
type PlanItemInit = Pick<
  PlanItem,
  "id" | "exercise" | "label" | "prescription" | "supersetId" | "logged" | "carried" | "skipped"
>;

/** One exercise in today's queue, with what is prescribed and what has been logged. */
export class PlanItem {
  readonly id: string;
  readonly exercise: Exercise;
  /** Heading shown beside the exercise: its group, or the cycled slot's target muscle. */
  readonly label: string;
  /** Null for an unplanned extra, which has no set target. */
  readonly prescription: Prescription | null;
  readonly supersetId?: string | undefined;
  /** The sets logged today. */
  readonly logged: readonly LoggedSet[];
  /**
   * How many prescribed sets of each kind earlier days of this floating day
   * already did (none on a weekday plan). Counted by kind, not by place, so
   * a plan edit after the fact cannot turn a working set done into a warm-up.
   */
  readonly carried: SetCounts;
  readonly skipped: boolean;

  constructor(init: PlanItemInit) {
    this.id = init.id;
    this.exercise = init.exercise;
    this.label = init.label;
    this.prescription = init.prescription;
    this.supersetId = init.supersetId;
    this.logged = init.logged;
    this.carried = init.carried;
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

  /** How many sets of `type` the prescription asks for. */
  private prescribed(type: SetType): number {
    return this.prescription?.sets.filter((spec) => spec.type === type).length ?? 0;
  }

  /** Of `done` sets of each kind, those the prescription asks for: no more of a kind than it has. */
  private prescribedOf(done: SetCounts): SetCounts {
    const counts = { ...NO_SETS };
    for (const type of SET_TYPES) counts[type] = Math.min(done[type], this.prescribed(type));
    return counts;
  }

  /** Prescribed sets earlier days did. */
  private get carriedDone(): number {
    return totalSets(this.prescribedOf(this.carried));
  }

  /** Of each kind, what earlier days and today did together. */
  private get doneOfEachKind(): SetCounts {
    const today = countSets(this.logged.map((set) => set.setType));
    const counts = { ...NO_SETS };
    for (const type of SET_TYPES) counts[type] = this.carried[type] + today[type];
    return counts;
  }

  /** Prescribed sets this calendar day owes: what earlier days left (0 for extras). */
  get owed(): number {
    return Math.max(0, this.planned - this.carriedDone);
  }

  /** Sets done toward the prescription: those carried from earlier days and today's. */
  get done(): number {
    return this.carriedDone + this.logged.length;
  }

  /** Prescribed sets of each kind done so far: what a day that comes back starts from. */
  get completed(): SetCounts {
    return this.prescribedOf(this.doneOfEachKind);
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
   * exhausted. The sets done — earlier days' and today's — are matched to the
   * prescribed ones by kind rather than by position, so the set still owed is
   * the right one even after a set was undone or the plan changed meanwhile:
   * with only the warm-up missing, the warm-up is what comes next.
   */
  get nextSet(): SetSpec | null {
    if (this.prescription === null || this.done >= this.planned) return null;
    const unmatched = this.doneOfEachKind;
    const owed = this.prescription.sets.find((spec) => {
      if (unmatched[spec.type] === 0) return true;
      unmatched[spec.type] -= 1;
      return false;
    });
    return owed ?? null;
  }

  /** How many non-warm-up sets have been done (the index progression compares on). */
  get workingSetsDone(): number {
    const carried = this.prescribedOf(this.carried);
    return carried.working + carried.drop + this.logged.filter((set) => !isWarmup(set)).length;
  }

  /** Load moved so far, in kg: reps × weight over the logged sets, warm-ups left out. */
  get loadLifted(): number {
    const lifted = this.logged.filter((set) => !isWarmup(set));
    return sum(lifted, (set) => set.value * (set.weight ?? 0));
  }
}
