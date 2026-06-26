/**
 * @nabd/dataset — exercise library: modular movement catalog + runtime accessors.
 *
 * Architecture:
 *   - movements.ts  → Movement catalog + compose() engine (muscle accuracy layer)
 *   - index.ts      → public API: exercises(), createLibrary(), defaultLibrary()
 */

import type { Exercise, Equipment, MuscleGroup, MuscleKey } from "@nabd/domain";
import { MUSCLE_PRIMARY_GROUP } from "@nabd/domain";
import { compose, MOVEMENTS } from "./movements";

// Re-export the Movement model so callers can extend/inspect the catalog.
export type { Movement, Laterality } from "./movements";
export { compose, MOVEMENTS } from "./movements";

// ---------------------------------------------------------------------------
// Core dataset
// ---------------------------------------------------------------------------

/**
 * Returns the full composed exercise library.
 * Every call re-composes from MOVEMENTS (deterministic, fast).
 */
export function exercises(): Exercise[] {
  return compose(MOVEMENTS);
}

// ---------------------------------------------------------------------------
// Library interface
// ---------------------------------------------------------------------------

export interface Library {
  /** All exercises in the library. */
  all(): Exercise[];
  /** Find exercise by id. */
  byId(id: string): Exercise | undefined;
  /** Case-insensitive substring search on name. */
  search(q: string): Exercise[];
  /** Exercises in the given muscle group. */
  byGroup(group: MuscleGroup): Exercise[];
  /** Exercises whose equipment is in the given profile equipment set. */
  filterByProfile(equipment: Equipment[]): Exercise[];
  /** Combined primary+secondary muscles of an exercise. */
  musclesOf(ex: Exercise): MuscleKey[];
  /** A new Library that also includes the given custom exercises. */
  withCustom(custom: Exercise[]): Library;
}

/** Build a Library over an explicit exercise array (used in tests + app). */
export function createLibrary(exs: Exercise[]): Library {
  return {
    all(): Exercise[] {
      return exs;
    },
    byId(id: string): Exercise | undefined {
      return exs.find((e) => e.id === id);
    },
    search(q: string): Exercise[] {
      const lower = q.toLowerCase();
      return exs.filter((e) => e.name.toLowerCase().includes(lower));
    },
    byGroup(group: MuscleGroup): Exercise[] {
      return exs.filter((e) => e.group === group);
    },
    filterByProfile(equipment: Equipment[]): Exercise[] {
      const eqSet = new Set(equipment);
      return exs.filter((e) => e.custom === true || eqSet.has(e.equipment));
    },
    musclesOf(ex: Exercise): MuscleKey[] {
      return [...new Set([...ex.primary, ...ex.secondary])];
    },
    withCustom(custom: Exercise[]): Library {
      return createLibrary([...exs, ...custom]);
    },
  };
}

/** Default library over the composed MOVEMENTS dataset. */
export function defaultLibrary(): Library {
  return createLibrary(exercises());
}

// Re-export MUSCLE_PRIMARY_GROUP for consumers who need group derivation.
export { MUSCLE_PRIMARY_GROUP };
