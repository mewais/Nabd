import type { Equipment, Exercise, ExerciseLookup, Measure, MuscleGroup } from "@nabd/domain";
import { measureOf } from "@nabd/domain";
import { MOVEMENTS } from "./catalog";
import { compose } from "./compose";

/** Filters for browsing the library; every field is optional. */
export interface LibraryQuery {
  /** Case-insensitive substring of the exercise name. */
  text?: string;
  group?: MuscleGroup;
  /** Keep only exercises doable with this equipment. */
  equipment?: ReadonlySet<Equipment>;
  /** Keep only exercises counted in reps, or only those counted in seconds. */
  measure?: Measure;
}

/** An immutable, id-indexed set of exercises. */
export class ExerciseLibrary {
  private readonly index: ReadonlyMap<string, Exercise>;

  constructor(private readonly exercises: readonly Exercise[]) {
    this.index = new Map(exercises.map((e) => [e.id, e]));
  }

  /** The built-in catalog (composed once, shared). */
  static readonly catalog: ExerciseLibrary = new ExerciseLibrary(compose(MOVEMENTS));

  byId(id: string): Exercise | undefined {
    return this.index.get(id);
  }

  /** {@link byId} as a standalone function, for the engines that only need to look exercises up. */
  readonly lookup: ExerciseLookup = (id) => this.byId(id);

  /** The exercises matching every given filter, in library order (`{}` lists them all). */
  find({ text, group, equipment, measure }: LibraryQuery): Exercise[] {
    const needle = text?.trim().toLowerCase() ?? "";
    return this.exercises.filter(
      (e) =>
        (needle === "" || e.name.toLowerCase().includes(needle)) &&
        (group === undefined || e.group === group) &&
        (equipment === undefined || equipment.has(e.equipment)) &&
        (measure === undefined || measureOf(e.tracking) === measure),
    );
  }

  /** A new library that also contains the given custom exercises. */
  withCustom(custom: readonly Exercise[]): ExerciseLibrary {
    return custom.length === 0 ? this : new ExerciseLibrary([...this.exercises, ...custom]);
  }
}
