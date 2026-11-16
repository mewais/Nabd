import type { Direction, Intensity, Measure, Prescription, RepMode, SetSpec } from "@nabd/domain";
import { INTENSITY_SCALES, measureOfMode } from "@nabd/domain";
import { defaultRepMode, defaultSet } from "./defaults";
import * as spec from "./set-spec";

const REST_STEP_SEC = 15;

/** The two ways reps can be written. A duration has only one, so it is not among them. */
export type RepStyle = Exclude<RepMode, "time">;

/** A change to one prescription, expressed against its editor: the prescription it makes. */
export type PrescriptionEdit = (editor: PrescriptionEditor) => Prescription;

/**
 * Every change the planner can make to one prescription (an exercise row's or
 * a cycled slot's). Like {@link ProgramEditor}, each method returns a new
 * prescription — of the row or slot it was given, the rest of it as it was —
 * and leaves the original untouched; a change that does not apply returns the
 * original itself.
 */
export class PrescriptionEditor<T extends Prescription = Prescription> {
  constructor(private readonly prescription: T) {}

  private edit(change: (draft: T) => void): T {
    const draft = structuredClone(this.prescription);
    change(draft);
    return draft;
  }

  /** A copy with `fields` changed, and every set of it changed by `change`. */
  private editSets(fields: Partial<Prescription>, change: (set: SetSpec) => void): T {
    return this.edit((draft) => {
      Object.assign(draft, fields);
      for (const set of draft.sets) change(set);
    });
  }

  /** The set at `index` of a copy, changed by `change`; the original when there is none. */
  private editSet(index: number, change: (set: SetSpec, draft: T) => void): T {
    if (this.prescription.sets[index] === undefined) return this.prescription;
    return this.edit((draft) => change(draft.sets[index]!, draft));
  }

  private get measure(): Measure {
    return measureOfMode(this.prescription.repMode);
  }

  /**
   * Count the prescription in `measure`, if it is not already. Seconds and reps
   * are different quantities, so every set starts from the new measure's default
   * instead of reading 45 s as 45 reps.
   */
  countIn(measure: Measure): T {
    if (this.measure === measure) return this.prescription;
    const [repMode, fresh] = [defaultRepMode(measure), defaultSet(measure)];
    return this.editSets({ repMode }, (set) => spec.takeAmounts(set, fresh));
  }

  /**
   * Write reps as a range or as a fixed number. Whether a prescription counts
   * reps or seconds is its exercise's doing ({@link countIn}), not a choice, so
   * a timed prescription is left as it is.
   */
  setRepStyle(style: RepStyle): T {
    if (this.prescription.repMode === "time") return this.prescription;
    return this.editSets({ repMode: style }, (set) => spec.writeReps(set, style === "range"));
  }

  /**
   * Switch how load is prescribed. An RPE and a percentage are different scales,
   * so every set starts from the new one's usual value.
   */
  setIntensity(mode: Intensity): T {
    if (this.prescription.intensity === mode) return this.prescription;
    return this.editSets({ intensity: mode }, (set) => spec.holdIntensity(set, mode));
  }

  /** Shorten or lengthen the rest by one step of 15 s. */
  stepRest(direction: Direction): T {
    const rest = Math.max(0, this.prescription.rest + direction * REST_STEP_SEC);
    return this.edit((draft) => Object.assign(draft, { rest }));
  }

  /** Append a working set copied from the last set. */
  addSet(): T {
    const set = { ...this.modelSet(-1), type: "working" } as const;
    return this.edit((draft) => draft.sets.push(set));
  }

  /** Prepend a warm-up set modelled on the first set. */
  addWarmup(): T {
    const set = { ...this.modelSet(0), type: "warmup" } as const;
    return this.edit((draft) => draft.sets.unshift(set));
  }

  /** The set at `index` (from the end when negative), or a default one: what a new set copies. */
  private modelSet(index: number): SetSpec {
    return this.prescription.sets.at(index) ?? defaultSet(this.measure);
  }

  /** Remove a set (a prescription always keeps at least one). */
  removeSet(index: number): T {
    if (this.prescription.sets.length <= 1) return this.prescription;
    return this.editSet(index, (_set, draft) => draft.sets.splice(index, 1));
  }

  /** working → warm-up → drop → working. */
  cycleSetType(index: number): T {
    return this.editSet(index, spec.cycleType);
  }

  /** Step a set's reps or seconds (the bottom of its range); the top never falls below it. */
  stepAmount(index: number, direction: Direction): T {
    return this.editSet(index, (set) => spec.stepAmount(set, direction, this.measure));
  }

  /** Step the top of a set's rep range, never below its bottom. */
  stepUpTo(index: number, direction: Direction): T {
    if (this.prescription.sets[index]?.upTo === undefined) return this.prescription;
    return this.editSet(index, (set) => spec.stepUpTo(set, direction, this.measure));
  }

  /**
   * Hold every set's intensity to the prescription's scale: within its
   * bounds, at its usual value where a set has none, and absent where load is
   * not prescribed. What the planner writes always obeys this; what was stored
   * or imported is brought to it.
   */
  keepIntensitiesOnScale(): T {
    const mode = this.prescription.intensity;
    return this.editSets({}, (set) => spec.holdIntensity(set, mode, set.intensity));
  }

  /** Step a set's intensity (RPE or %1RM) within its bounds. */
  stepIntensity(index: number, direction: Direction): T {
    const mode = this.prescription.intensity;
    const current = this.prescription.sets[index]?.intensity;
    if (current === undefined || mode === "none") return this.prescription;
    return this.editSet(index, (set) =>
      spec.holdIntensity(set, mode, current + direction * INTENSITY_SCALES[mode].step),
    );
  }

  setNotes(notes: string): T {
    return this.edit((draft) => Object.assign(draft, { notes }));
  }
}
