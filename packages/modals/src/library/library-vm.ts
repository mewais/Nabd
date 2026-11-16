import type { ExerciseLibrary } from "@nabd/dataset";
import type { Equipment, Exercise, ExerciseDraft, Measure } from "@nabd/domain";
import {
  EQUIPMENT_NAMES,
  MUSCLE_NAMES,
  TRACK_NAMES,
  isCompleteDraft,
  muscleList,
  poolMeasure,
} from "@nabd/domain";
import type { LibraryState, LibraryTarget } from "@nabd/view";
import type { GroupFilter } from "../options";

interface LibraryInput {
  /** The library as the user has it open. */
  state: LibraryState;
  /** What the pool being added to holds so far; empty for any other target. */
  pool: readonly string[];
  library: ExerciseLibrary;
  /** Only exercises for equipment the user owns are offered. */
  owned: readonly Equipment[];
}

export interface LibraryRowVM {
  id: string;
  name: string;
  /** "Chest, Triceps · Weight & reps · Barbell". */
  detail: string;
  custom: boolean;
  addLabel: string;
}

export interface LibraryBrowserVM {
  search: string;
  group: GroupFilter;
  rows: LibraryRowVM[];
  /** Why some exercises are not offered at all; null when everything owned is. */
  scopeNote: string | null;
  /** Shown in place of the list when nothing matches. */
  emptyNote: string | null;
}

export interface ExerciseFormVM extends ExerciseDraft {
  /** An exercise needs a name and at least one primary muscle. */
  canCreate: boolean;
}

export type LibraryVM =
  | { title: string; mode: "browse"; browser: LibraryBrowserVM }
  | { title: string; mode: "create"; form: ExerciseFormVM };

const EMPTY_NOTE = "No exercises match — check the filter, or your equipment in Settings.";

function titleFor(target: LibraryTarget): string {
  switch (target.kind) {
    case "exercise":
      return "Add Exercise";
    case "pool":
      return `Add to Pool — ${MUSCLE_NAMES[target.muscle]}`;
    case "extra":
      return "Log Something Else";
  }
}

function row(exercise: Exercise): LibraryRowVM {
  const detail = [
    muscleList(exercise),
    TRACK_NAMES[exercise.tracking],
    EQUIPMENT_NAMES[exercise.equipment],
  ];
  return {
    id: exercise.id,
    name: exercise.name,
    detail: detail.join(" · "),
    custom: exercise.custom === true,
    addLabel: `Add ${exercise.name}`,
  };
}

const SCOPE_NOTES: Record<Measure, string> = {
  reps: "This pool is counted in reps, like its first exercise, so timed exercises are not offered.",
  time: "This pool is timed, like its first exercise, so only timed exercises are offered.",
};

/** The library modal; null while it is closed. */
export function buildLibraryVM({ state, pool, library, owned }: LibraryInput): LibraryVM | null {
  const { target, search, group, draft } = state;
  if (target === null) return null;
  const title = titleFor(target);
  if (draft !== null) {
    return { title, mode: "create", form: { ...draft, canCreate: isCompleteDraft(draft) } };
  }
  // A cycled pool shares one prescription, so once it has an exercise it only
  // takes more of that measure.
  const measure = poolMeasure(pool, library.lookup);
  const rows = library
    .find({
      text: search,
      group: group ?? undefined,
      equipment: new Set(owned),
      measure: measure ?? undefined,
    })
    .map(row);
  return {
    title,
    mode: "browse",
    browser: {
      search,
      group: group ?? "all",
      rows,
      scopeNote: measure && SCOPE_NOTES[measure],
      emptyNote: rows.length === 0 ? EMPTY_NOTE : null,
    },
  };
}
