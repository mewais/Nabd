import type { Direction, Intensity, Measure, Prescription, RepMode, SetSpec } from "@nabd/domain";
import { SECONDS_STEP, SET_TYPES, clamp, measureOfMode } from "@nabd/domain";

const REST_STEP_SEC = 15;
/** How far apart a range starts when a fixed rep count becomes one: 8 → 8–10. */
const RANGE_SPAN = 2;

interface IntensityScale {
  min: number;
  max: number;
  step: number;
  initial: number;
}
const INTENSITY_SCALES: Record<Exclude<Intensity, "none">, IntensityScale> = {
  rpe: { min: 5, max: 10, step: 0.5, initial: 8 },
  pct: { min: 40, max: 100, step: 2.5, initial: 70 },
};

/** The two ways reps can be written. A duration has only one, so it is not among them. */
export type RepStyle = Exclude<RepMode, "time">;

/** The set a new prescription starts from: a 45 s hold, or 8–12 reps. */
const defaultSet = (measure: Measure): SetSpec =>
  measure === "time" ? { type: "working", amount: 45 } : { type: "working", amount: 8, upTo: 12 };

/** A change to one prescription, expressed against its editor. */
export type PrescriptionEdit = (editor: PrescriptionEditor) => void;

/**
 * Every change the planner can make to one prescription (an exercise row's or
 * a cycled slot's). It edits the prescription it is given in place;
 * ProgramEditor hands it one from a copy of the program.
 */
export class PrescriptionEditor {
  constructor(private readonly prescription: Prescription) {}

  /** What a newly added exercise or slot is prescribed: three default sets. */
  static initial(measure: Measure): Prescription {
    const set = defaultSet(measure);
    return {
      repMode: measure === "time" ? "time" : "range",
      intensity: "none",
      rest: measure === "time" ? 60 : 120,
      sets: [{ ...set }, { ...set }, { ...set }],
    };
  }

  private get measure(): Measure {
    return measureOfMode(this.prescription.repMode);
  }

  /**
   * Count the prescription in `measure`, if it is not already. Seconds and reps
   * are different quantities, so every set starts from the new measure's default
   * instead of reading 45 s as 45 reps.
   */
  countIn(measure: Measure): void {
    if (this.measure === measure) return;
    const fresh = defaultSet(measure);
    this.prescription.repMode = measure === "time" ? "time" : "range";
    for (const set of this.prescription.sets) {
      set.amount = fresh.amount;
      if (fresh.upTo === undefined) delete set.upTo;
      else set.upTo = fresh.upTo;
    }
  }

  /**
   * Write reps as a range or as a fixed number. Whether a prescription counts
   * reps or seconds is its exercise's doing ({@link countIn}), not a choice, so
   * a timed prescription is left as it is.
   */
  setRepStyle(style: RepStyle): void {
    if (this.prescription.repMode === "time") return;
    this.prescription.repMode = style;
    for (const set of this.prescription.sets) {
      if (style === "range") set.upTo ??= set.amount + RANGE_SPAN;
      else delete set.upTo;
    }
  }

  /**
   * Switch how load is prescribed. An RPE and a percentage are different scales,
   * so every set starts from the new one's usual value.
   */
  setIntensity(mode: Intensity): void {
    if (this.prescription.intensity === mode) return;
    this.prescription.intensity = mode;
    for (const set of this.prescription.sets) {
      if (mode === "none") delete set.intensity;
      else set.intensity = INTENSITY_SCALES[mode].initial;
    }
  }

  /** Shorten or lengthen the rest by one step of 15 s. */
  stepRest(direction: Direction): void {
    this.prescription.rest = Math.max(0, this.prescription.rest + direction * REST_STEP_SEC);
  }

  /** Append a working set copied from the last set. */
  addSet(): void {
    const template = this.prescription.sets.at(-1) ?? defaultSet(this.measure);
    this.prescription.sets.push({ ...template, type: "working" });
  }

  /** Prepend a warm-up set modelled on the first set. */
  addWarmup(): void {
    const template = this.prescription.sets[0] ?? defaultSet(this.measure);
    this.prescription.sets.unshift({ ...template, type: "warmup" });
  }

  /** Remove a set (a prescription always keeps at least one). */
  removeSet(index: number): void {
    if (this.prescription.sets.length > 1) this.prescription.sets.splice(index, 1);
  }

  /** working → warm-up → drop → working. */
  cycleSetType(index: number): void {
    const set = this.prescription.sets[index];
    if (!set) return;
    set.type = SET_TYPES[(SET_TYPES.indexOf(set.type) + 1) % SET_TYPES.length] ?? "working";
  }

  /** One step of a set's amount: a rep, or a few seconds. */
  private get amountStep(): number {
    return this.measure === "time" ? SECONDS_STEP : 1;
  }

  /** Step a set's reps or seconds (the bottom of its range); the top never falls below it. */
  stepAmount(index: number, direction: Direction): void {
    const set = this.prescription.sets[index];
    if (!set) return;
    set.amount = Math.max(this.amountStep, set.amount + direction * this.amountStep);
    if (set.upTo !== undefined) set.upTo = Math.max(set.upTo, set.amount);
  }

  /** Step the top of a set's rep range, never below its bottom. */
  stepUpTo(index: number, direction: Direction): void {
    const set = this.prescription.sets[index];
    if (set?.upTo === undefined) return;
    set.upTo = Math.max(set.amount, set.upTo + direction * this.amountStep);
  }

  /** Step a set's intensity (RPE or %1RM) within its bounds. */
  stepIntensity(index: number, direction: Direction): void {
    const set = this.prescription.sets[index];
    const mode = this.prescription.intensity;
    if (set?.intensity === undefined || mode === "none") return;
    const scale = INTENSITY_SCALES[mode];
    set.intensity = clamp(set.intensity + direction * scale.step, scale.min, scale.max);
  }

  setNotes(notes: string): void {
    this.prescription.notes = notes;
  }
}
