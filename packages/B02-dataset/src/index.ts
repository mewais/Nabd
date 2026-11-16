/**
 * @nabd/dataset — the exercise library.
 *
 *   movements.ts → Movement catalog + compose() (owns muscle tagging)
 *   index.ts     → ExerciseLibrary: indexed lookup over catalog + custom exercises
 */

import type { Equipment, Exercise, MuscleGroup } from "@nabd/domain";
import { compose, MOVEMENTS } from "./movements";

export type { Movement, Laterality } from "./movements";
export { compose, MOVEMENTS } from "./movements";

/** Filters for browsing the library; every field is optional. */
export interface LibraryQuery {
  /** Case-insensitive substring of the exercise name. */
  text?: string;
  group?: MuscleGroup;
  /** Keep only exercises doable with this equipment. */
  equipment?: ReadonlySet<Equipment>;
}

/** An immutable, id-indexed set of exercises. */
export class ExerciseLibrary {
  private readonly index: ReadonlyMap<string, Exercise>;

  constructor(private readonly exercises: readonly Exercise[]) {
    this.index = new Map(exercises.map((e) => [e.id, e]));
  }

  /** The built-in catalog (composed once, shared). */
  static readonly catalog: ExerciseLibrary = new ExerciseLibrary(compose(MOVEMENTS));

  all(): readonly Exercise[] {
    return this.exercises;
  }

  byId(id: string): Exercise | undefined {
    return this.index.get(id);
  }

  find({ text, group, equipment }: LibraryQuery): Exercise[] {
    const needle = text?.trim().toLowerCase() ?? "";
    return this.exercises.filter(
      (e) =>
        (needle === "" || e.name.toLowerCase().includes(needle)) &&
        (group === undefined || e.group === group) &&
        (equipment === undefined || equipment.has(e.equipment)),
    );
  }

  /** A new library that also contains the given custom exercises. */
  withCustom(custom: readonly Exercise[]): ExerciseLibrary {
    return custom.length === 0 ? this : new ExerciseLibrary([...this.exercises, ...custom]);
  }
}
