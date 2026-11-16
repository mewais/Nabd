import type { Option } from "@nabd/design-system";
import type { Equipment, Exercise, ExerciseDraft, MuscleGroup, MuscleKey } from "@nabd/domain";
import {
  EQUIPMENT_NAMES,
  MUSCLES_ANATOMICAL,
  MUSCLE_GROUPS,
  MUSCLE_NAMES,
  TRACKING_KEYS,
  TRACK_NAMES,
  muscleNames,
} from "@nabd/domain";
import type { ExerciseLibrary } from "@nabd/dataset";

/** What picking an exercise will do; it decides the modal's title. */
export type LibraryPurpose =
  | { kind: "exercise" }
  | { kind: "pool"; muscle: MuscleKey }
  | { kind: "extra" };

/** The library modal's state; `target` null means it is closed. */
export interface LibraryInput {
  target: LibraryPurpose | null;
  search: string;
  group: MuscleGroup | null;
  /** The custom-exercise form, while it is showing. */
  draft: ExerciseDraft | null;
}

/** The group filter's "no filter" choice. */
export type GroupFilter = MuscleGroup | "all";

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
  /** Shown in place of the list when nothing matches. */
  emptyNote: string | null;
}

export interface ExerciseFormVM extends ExerciseDraft {
  /** An exercise needs at least one primary muscle. */
  canCreate: boolean;
}

export type LibraryVM =
  | { title: string; mode: "browse"; browser: LibraryBrowserVM }
  | { title: string; mode: "create"; form: ExerciseFormVM };

export const GROUP_OPTIONS: readonly Option<GroupFilter>[] = [
  { value: "all", label: "All" },
  ...MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
];
export const MUSCLE_OPTIONS = MUSCLES_ANATOMICAL.map((value) => ({
  value,
  label: MUSCLE_NAMES[value],
}));
export const TRACKING_OPTIONS = TRACKING_KEYS.map((value) => ({
  value,
  label: TRACK_NAMES[value],
}));

const EMPTY_NOTE = "No exercises match — check the filter, or your equipment in Settings.";

function titleFor(target: LibraryPurpose): string {
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
    muscleNames(exercise).join(", "),
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

/** The library modal for `state`; null while it is closed. Only exercises for `owned` equipment are offered. */
export function buildLibraryVM(
  state: LibraryInput,
  library: ExerciseLibrary,
  owned: readonly Equipment[],
): LibraryVM | null {
  const { target, search, group, draft } = state;
  if (target === null) return null;
  const title = titleFor(target);
  if (draft !== null) {
    return { title, mode: "create", form: { ...draft, canCreate: draft.primary.length > 0 } };
  }
  const rows = library
    .find({ text: search, group: group ?? undefined, equipment: new Set(owned) })
    .map(row);
  return {
    title,
    mode: "browse",
    browser: {
      search,
      group: group ?? "all",
      rows,
      emptyNote: rows.length === 0 ? EMPTY_NOTE : null,
    },
  };
}
