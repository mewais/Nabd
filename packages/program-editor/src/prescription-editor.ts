import type { Direction, Intensity, Measure, Prescription, RepMode, SetSpec } from "@nabd/domain";
import { INTENSITY_SCALES, SECONDS_STEP, SET_TYPES, clamp, measureOfMode } from "@nabd/domain";
import { defaultRepMode, defaultSet } from "./defaults";

const REST_STEP_SEC = 15;
/** How far apart a range starts when a fixed rep count becomes one: 8 → 8–10. */
const RANGE_SPAN = 2;

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
    const fresh = defaultSet(measure);
    return this.edit((draft) => {
      draft.repMode = defaultRepMode(measure);
      for (const set of draft.sets) {
        set.amount = fresh.amount;
        if (fresh.upTo === undefined) delete set.upTo;
        else set.upTo = fresh.upTo;
      }
    });
  }

  /**
   * Write reps as a range or as a fixed number. Whether a prescription counts
   * reps or seconds is its exercise's doing ({@link countIn}), not a choice, so
   * a timed prescription is left as it is.
   */
  setRepStyle(style: RepStyle): T {
    if (this.prescription.repMode === "time") return this.prescription;
    return this.edit((draft) => {
      draft.repMode = style;
      for (const set of draft.sets) {
        if (style === "range") set.upTo ??= set.amount + RANGE_SPAN;
        else delete set.upTo;
      }
    });
  }

  /**
   * Switch how load is prescribed. An RPE and a percentage are different scales,
   * so every set starts from the new one's usual value.
   */
  setIntensity(mode: Intensity): T {
    if (this.prescription.intensity === mode) return this.prescription;
    return this.edit((draft) => {
      draft.intensity = mode;
      for (const set of draft.sets) {
        if (mode === "none") delete set.intensity;
        else set.intensity = INTENSITY_SCALES[mode].initial;
      }
    });
  }

  /** Shorten or lengthen the rest by one step of 15 s. */
  stepRest(direction: Direction): T {
    return this.edit((draft) => {
      draft.rest = Math.max(0, draft.rest + direction * REST_STEP_SEC);
    });
  }

  /** Append a working set copied from the last set. */
  addSet(): T {
    return this.edit((draft) => {
      const template = draft.sets.at(-1) ?? defaultSet(this.measure);
      draft.sets.push({ ...template, type: "working" });
    });
  }

  /** Prepend a warm-up set modelled on the first set. */
  addWarmup(): T {
    return this.edit((draft) => {
      const template = draft.sets[0] ?? defaultSet(this.measure);
      draft.sets.unshift({ ...template, type: "warmup" });
    });
  }

  /** Remove a set (a prescription always keeps at least one). */
  removeSet(index: number): T {
    if (this.prescription.sets.length <= 1) return this.prescription;
    return this.editSet(index, (_set, draft) => draft.sets.splice(index, 1));
  }

  /** working → warm-up → drop → working. */
  cycleSetType(index: number): T {
    return this.editSet(index, (set) => {
      set.type = SET_TYPES[(SET_TYPES.indexOf(set.type) + 1) % SET_TYPES.length] ?? "working";
    });
  }

  /** One step of a set's amount: a rep, or a few seconds. */
  private get amountStep(): number {
    return this.measure === "time" ? SECONDS_STEP : 1;
  }

  /** Step a set's reps or seconds (the bottom of its range); the top never falls below it. */
  stepAmount(index: number, direction: Direction): T {
    return this.editSet(index, (set) => {
      set.amount = Math.max(this.amountStep, set.amount + direction * this.amountStep);
      if (set.upTo !== undefined) set.upTo = Math.max(set.upTo, set.amount);
    });
  }

  /** Step the top of a set's rep range, never below its bottom. */
  stepUpTo(index: number, direction: Direction): T {
    if (this.prescription.sets[index]?.upTo === undefined) return this.prescription;
    return this.editSet(index, (set) => {
      set.upTo = Math.max(set.amount, (set.upTo ?? set.amount) + direction * this.amountStep);
    });
  }

  /**
   * Hold every set's intensity to the prescription's scale: within its
   * bounds, at its usual value where a set has none, and absent where load is
   * not prescribed. What the planner writes always obeys this; what was stored
   * or imported is brought to it.
   */
  keepIntensitiesOnScale(): T {
    return this.edit((draft) => {
      const mode = draft.intensity;
      for (const set of draft.sets) {
        if (mode === "none") delete set.intensity;
        else {
          const scale = INTENSITY_SCALES[mode];
          set.intensity = clamp(set.intensity ?? scale.initial, scale.min, scale.max);
        }
      }
    });
  }

  /** Step a set's intensity (RPE or %1RM) within its bounds. */
  stepIntensity(index: number, direction: Direction): T {
    const mode = this.prescription.intensity;
    if (this.prescription.sets[index]?.intensity === undefined || mode === "none") {
      return this.prescription;
    }
    const scale = INTENSITY_SCALES[mode];
    return this.editSet(index, (set) => {
      set.intensity = clamp(
        (set.intensity ?? scale.initial) + direction * scale.step,
        scale.min,
        scale.max,
      );
    });
  }

  setNotes(notes: string): T {
    return this.edit((draft) => {
      draft.notes = notes;
    });
  }
}
