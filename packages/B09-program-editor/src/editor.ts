import type {
  Day,
  Exercise,
  Intensity,
  MuscleKey,
  Prescription,
  Program,
  ProgramType,
  RepMode,
  Schedule,
  SetSpec,
  SetType,
} from "@nabd/domain";
import { GROUP_PRIMARY_MUSCLE, isTimeBased } from "@nabd/domain";

export type ExerciseLookup = (exId: string) => Exercise | undefined;

/** Points at the prescription being edited: a fixed exercise row or a cycled slot. */
export interface EditRef {
  kind: "ex" | "slot";
  id: string;
}

/** A change to the program, expressed against an editor (see {@link ProgramEditor}). */
export type ProgramEdit = (editor: ProgramEditor) => Program;

const SET_TYPE_CYCLE: SetType[] = ["working", "warmup", "drop"];
/** Monday-first weekday numbers (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const REST_STEP_SEC = 15;
const TIME_STEP_SEC = 5;
const RPE = { min: 5, max: 10, step: 0.5, initial: 8 };
const PCT = { min: 40, max: 100, step: 2.5, initial: 70 };

/** Days a weekday schedule has room for: one per weekday, as a further day could never come up. */
const WEEKDAY_SLOTS = WEEK_ORDER.length;

/** The set a new prescription starts from: a 45 s hold, or 8–12 reps. */
const defaultSet = (timeBased: boolean): SetSpec =>
  timeBased ? { type: "working", a: 45 } : { type: "working", a: 8, b: 12 };

const defaultPrescription = (timeBased: boolean): Prescription => {
  const set = defaultSet(timeBased);
  return {
    repMode: timeBased ? "time" : "range",
    intensity: "none",
    rest: timeBased ? 60 : 120,
    sets: [{ ...set }, { ...set }, { ...set }],
  };
};

/** Move the element at `index` one place up (-1) or down (+1), if there is room. */
function shift<T>(list: T[], index: number, direction: number): void {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target]!, list[index]!];
}

/**
 * Every way the planner can change a program. Each method returns a new
 * Program and leaves the original untouched.
 */
export class ProgramEditor {
  constructor(
    private readonly program: Program,
    private readonly newId: () => string,
    private readonly lookup: ExerciseLookup,
  ) {}

  private edit(change: (draft: Program) => void): Program {
    const draft = structuredClone(this.program);
    change(draft);
    return draft;
  }

  private editDay(dayId: string, change: (day: Day, draft: Program) => void): Program {
    return this.edit((draft) => {
      const day = draft.days.find((d) => d.id === dayId);
      if (day) change(day, draft);
    });
  }

  private editPrescription(
    dayId: string,
    ref: EditRef,
    change: (prescription: Prescription) => void,
  ): Program {
    return this.editDay(dayId, (day) => {
      const list: (Prescription & { id: string })[] =
        ref.kind === "slot" ? day.slots : day.exercises;
      const prescription = list.find((p) => p.id === ref.id);
      if (prescription) change(prescription);
    });
  }

  // ----- Program -----

  rename(name: string): Program {
    return this.edit((draft) => {
      draft.name = name;
    });
  }

  /** Switch plan type; going cycled derives slots for days that have none yet. */
  setType(type: ProgramType): Program {
    return this.edit((draft) => {
      draft.type = type;
      if (type !== "cycled") return;
      for (const day of draft.days) {
        if (day.slots.length === 0) day.slots = this.deriveSlots(day);
      }
    });
  }

  /**
   * Switch schedule. Going weekday gives every unplaced day a free weekday, and
   * is refused while the plan has more days than a week. Going floating puts
   * the days in the order they ran through the week, Monday first.
   */
  setSchedule(schedule: Schedule): Program {
    if (schedule === "weekday" && this.program.days.length > WEEKDAY_SLOTS) return this.program;
    return this.edit((draft) => {
      draft.schedule = schedule;
      if (schedule === "floating") {
        const weekPosition = (day: Day): number =>
          day.weekday === null ? WEEKDAY_SLOTS : WEEK_ORDER.indexOf(day.weekday);
        draft.days.sort((a, b) => weekPosition(a) - weekPosition(b));
        return;
      }
      const taken = new Set(draft.days.map((d) => d.weekday));
      const free = WEEK_ORDER.filter((wd) => !taken.has(wd));
      for (const day of draft.days) {
        if (day.weekday === null) day.weekday = free.shift() ?? null;
      }
    });
  }

  // ----- Days -----

  /** Add an empty day; a weekday schedule that is already full stays as it is. */
  addDay(weekday: number | null): Program {
    const { schedule, days } = this.program;
    if (schedule === "weekday" && days.length >= WEEKDAY_SLOTS) return this.program;
    return this.edit((draft) => {
      draft.days.push({ id: this.newId(), name: "New day", weekday, exercises: [], slots: [] });
    });
  }

  removeDay(dayId: string): Program {
    return this.edit((draft) => {
      draft.days = draft.days.filter((d) => d.id !== dayId);
    });
  }

  renameDay(dayId: string, name: string): Program {
    return this.editDay(dayId, (day) => {
      day.name = name;
    });
  }

  /** Put a day on a weekday; a day already there swaps places with it. */
  setWeekday(dayId: string, weekday: number): Program {
    return this.editDay(dayId, (day, draft) => {
      const occupant = draft.days.find((d) => d.weekday === weekday && d.id !== dayId);
      if (occupant) occupant.weekday = day.weekday;
      day.weekday = weekday;
    });
  }

  /** Move a day earlier (-1) or later (+1) in the floating order. */
  moveDay(dayId: string, direction: number): Program {
    return this.edit((draft) => {
      shift(
        draft.days,
        draft.days.findIndex((d) => d.id === dayId),
        direction,
      );
    });
  }

  // ----- Fixed-mode exercises -----

  addExercise(dayId: string, exId: string): Program {
    const exercise = this.lookup(exId);
    if (!exercise) return this.program;
    return this.editDay(dayId, (day) => {
      day.exercises.push({
        id: this.newId(),
        exId: exercise.id,
        ...defaultPrescription(isTimeBased(exercise.tracking)),
      });
    });
  }

  removeExercise(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => {
      day.exercises = day.exercises.filter((e) => e.id !== rowId);
    });
  }

  /** Move an exercise earlier (-1) or later (+1) in its day. */
  moveExercise(dayId: string, rowId: string, direction: number): Program {
    return this.editDay(dayId, (day) => {
      shift(
        day.exercises,
        day.exercises.findIndex((e) => e.id === rowId),
        direction,
      );
    });
  }

  /**
   * An exercise already in a superset: dissolve that superset. Otherwise: link it
   * with the exercise after it (joining that one's superset if it has one).
   */
  toggleSuperset(dayId: string, rowId: string): Program {
    return this.editDay(dayId, (day) => {
      const index = day.exercises.findIndex((e) => e.id === rowId);
      const current = day.exercises[index];
      if (!current) return;
      if (current.supersetId !== undefined) {
        const supersetId = current.supersetId;
        for (const e of day.exercises) if (e.supersetId === supersetId) delete e.supersetId;
        return;
      }
      const next = day.exercises[index + 1];
      if (next) current.supersetId = next.supersetId ??= this.newId();
    });
  }

  /** Remove an exercise from every day and every pool (it was deleted from the library). */
  purgeExercise(exId: string): Program {
    return this.edit((draft) => {
      for (const day of draft.days) {
        day.exercises = day.exercises.filter((e) => e.exId !== exId);
        for (const slot of day.slots) slot.pool = slot.pool.filter((id) => id !== exId);
      }
    });
  }

  // ----- Cycled-mode slots -----

  addSlot(dayId: string, muscle: MuscleKey): Program {
    return this.editDay(dayId, (day) => {
      day.slots.push({ id: this.newId(), muscle, pool: [], ...defaultPrescription(false) });
    });
  }

  removeSlot(dayId: string, slotId: string): Program {
    return this.editDay(dayId, (day) => {
      day.slots = day.slots.filter((s) => s.id !== slotId);
    });
  }

  /** Move a slot earlier (-1) or later (+1) in its day. */
  moveSlot(dayId: string, slotId: string, direction: number): Program {
    return this.editDay(dayId, (day) => {
      shift(
        day.slots,
        day.slots.findIndex((s) => s.id === slotId),
        direction,
      );
    });
  }

  addToPool(dayId: string, slotId: string, exId: string): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot && !slot.pool.includes(exId)) slot.pool.push(exId);
    });
  }

  removeFromPool(dayId: string, slotId: string, exId: string): Program {
    return this.editDay(dayId, (day) => {
      const slot = day.slots.find((s) => s.id === slotId);
      if (slot) slot.pool = slot.pool.filter((id) => id !== exId);
    });
  }

  /** One slot per muscle group of a fixed day, pooling that group's exercises. */
  private deriveSlots(day: Day): Day["slots"] {
    const byGroup = new Map<string, Day["slots"][number]>();
    for (const row of day.exercises) {
      const exercise = this.lookup(row.exId);
      if (!exercise) continue;
      let slot = byGroup.get(exercise.group);
      if (!slot) {
        const { repMode, intensity, rest, sets } = structuredClone(row);
        slot = {
          id: this.newId(),
          muscle: GROUP_PRIMARY_MUSCLE[exercise.group],
          pool: [],
          repMode,
          intensity,
          rest,
          sets,
        };
        byGroup.set(exercise.group, slot);
      }
      if (!slot.pool.includes(row.exId)) slot.pool.push(row.exId);
    }
    return [...byGroup.values()];
  }

  // ----- Prescriptions (an exercise row or a cycled slot) -----

  /**
   * Switch how sets are prescribed. Seconds and reps are different quantities,
   * so crossing between time and a rep mode starts every set from that mode's
   * default instead of reading 45 s as 45 reps.
   */
  setRepMode(dayId: string, ref: EditRef, mode: RepMode): Program {
    return this.editPrescription(dayId, ref, (p) => {
      const fresh =
        (p.repMode === "time") !== (mode === "time") ? defaultSet(mode === "time") : null;
      p.repMode = mode;
      for (const set of p.sets) {
        if (fresh) set.a = fresh.a;
        if (fresh || mode !== "range") delete set.b;
        if (mode === "range") set.b ??= fresh?.b ?? set.a + 2;
      }
    });
  }

  setIntensity(dayId: string, ref: EditRef, mode: Intensity): Program {
    return this.editPrescription(dayId, ref, (p) => {
      p.intensity = mode;
      for (const set of p.sets) {
        if (mode === "none") delete set.val;
        else set.val ??= mode === "rpe" ? RPE.initial : PCT.initial;
      }
    });
  }

  /** Change rest by `direction` (±1) steps of 15 s. */
  stepRest(dayId: string, ref: EditRef, direction: number): Program {
    return this.editPrescription(dayId, ref, (p) => {
      p.rest = Math.max(0, p.rest + direction * REST_STEP_SEC);
    });
  }

  /** Append a working set copied from the last set. */
  addSet(dayId: string, ref: EditRef): Program {
    return this.editPrescription(dayId, ref, (p) => {
      const template: SetSpec = p.sets.at(-1) ?? defaultPrescription(p.repMode === "time").sets[0]!;
      p.sets.push({ ...template, type: "working" });
    });
  }

  /** Prepend a warm-up set modelled on the first set. */
  addWarmup(dayId: string, ref: EditRef): Program {
    return this.editPrescription(dayId, ref, (p) => {
      const template: SetSpec = p.sets[0] ?? defaultPrescription(p.repMode === "time").sets[0]!;
      p.sets.unshift({ ...template, type: "warmup" });
    });
  }

  /** Remove a set (a prescription always keeps at least one). */
  removeSet(dayId: string, ref: EditRef, index: number): Program {
    return this.editPrescription(dayId, ref, (p) => {
      if (p.sets.length > 1) p.sets.splice(index, 1);
    });
  }

  /** working → warmup → drop → working. */
  cycleSetType(dayId: string, ref: EditRef, index: number): Program {
    return this.editPrescription(dayId, ref, (p) => {
      const set = p.sets[index];
      if (!set) return;
      set.type = SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(set.type) + 1) % SET_TYPE_CYCLE.length]!;
    });
  }

  /** Step a set's reps/seconds (`a`) or the top of its range (`b`), keeping a ≤ b. */
  stepRep(
    dayId: string,
    ref: EditRef,
    index: number,
    which: "a" | "b",
    direction: number,
  ): Program {
    return this.editPrescription(dayId, ref, (p) => {
      const set = p.sets[index];
      if (!set) return;
      const step = p.repMode === "time" ? TIME_STEP_SEC : 1;
      if (which === "a") {
        set.a = Math.max(step, set.a + direction * step);
        if (set.b !== undefined) set.b = Math.max(set.b, set.a);
      } else if (set.b !== undefined) {
        set.b = Math.max(set.a, set.b + direction * step);
      }
    });
  }

  /** Step a set's intensity (RPE or %1RM) within its bounds. */
  stepVal(dayId: string, ref: EditRef, index: number, direction: number): Program {
    return this.editPrescription(dayId, ref, (p) => {
      const set = p.sets[index];
      if (!set || set.val === undefined || p.intensity === "none") return;
      const scale = p.intensity === "rpe" ? RPE : PCT;
      set.val = Math.min(scale.max, Math.max(scale.min, set.val + direction * scale.step));
    });
  }

  setNotes(dayId: string, ref: EditRef, notes: string): Program {
    return this.editPrescription(dayId, ref, (p) => {
      p.notes = notes;
    });
  }
}
