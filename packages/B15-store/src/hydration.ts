import { z } from "zod";
import type { ZodTypeAny } from "zod";
import {
  DayLogSchema,
  DayStateSchema,
  DEFAULT_SETTINGS,
  EMPTY_PROGRAM,
  ExerciseSchema,
  LoggedSetSchema,
  ProgramSchema,
  RotationStateSchema,
  SettingsSchema,
  freshDayState,
  plural,
} from "@nabd/domain";
import type { BootSnapshot, Singletons } from "@nabd/ipc-client";
import { upgradeDayState } from "@nabd/serialization";
import type { LoadProblem, NabdState, Notice } from "./state";

type Persisted = Pick<NabdState, keyof Singletons | "history">;

/** How each stored thing is named to the user. */
export const STORED_NAMES: Record<LoadProblem["source"], string> = {
  program: "your plan",
  settings: "your settings",
  customExercises: "your custom exercises",
  rotationState: "your exercise rotation",
  dayState: "today's progress",
  dayLog: "your completion log",
  history: "your logged sets",
  everything: "your data",
};

/**
 * Turn the raw boot snapshot into validated state. A value that was never
 * saved takes its default; one that is there but invalid also runs on the
 * default, and is reported so the store can keep from saving over it.
 */
export function readSnapshot(
  snapshot: BootSnapshot,
  now: Date,
): { state: Persisted; problems: LoadProblem[] } {
  const problems: LoadProblem[] = [];

  function read<S extends ZodTypeAny>(
    source: keyof Singletons,
    schema: S,
    value: unknown,
    fallback: z.output<S>,
  ): z.output<S> {
    if (value === null || value === undefined) return fallback;
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;
    const issue = parsed.error.errors[0]!;
    problems.push({ source, detail: `${issue.path.join(".") || "value"}: ${issue.message}` });
    return fallback;
  }

  /** History is validated row by row: one bad set must not hide all the others. */
  function readHistory(rows: unknown[]): Persisted["history"] {
    const sets = rows.flatMap((row) => {
      const parsed = LoggedSetSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
    const unreadable = rows.length - sets.length;
    if (unreadable > 0) {
      problems.push({ source: "history", detail: `${plural(unreadable, "set")} left out` });
    }
    return sets;
  }

  const { settings } = snapshot;
  const state: Persisted = {
    // Settings saved by an older version lack newer fields: fill them from the defaults.
    settings: read(
      "settings",
      SettingsSchema,
      typeof settings === "object" && settings !== null
        ? { ...DEFAULT_SETTINGS, ...settings }
        : settings,
      DEFAULT_SETTINGS,
    ),
    program: read("program", ProgramSchema, snapshot.program, EMPTY_PROGRAM),
    customExercises: read("customExercises", z.array(ExerciseSchema), snapshot.customExercises, []),
    rotationState: read("rotationState", RotationStateSchema, snapshot.rotationState, {}),
    dayState: read(
      "dayState",
      DayStateSchema,
      upgradeDayState(snapshot.dayState, snapshot.program),
      freshDayState(now),
    ),
    dayLog: read("dayLog", DayLogSchema, snapshot.dayLog, []),
    history: readHistory(snapshot.history),
  };
  return { state, problems };
}

/**
 * Whether a problem stops its value from being saved. Unreadable history rows
 * do not: sets are stored one row each, so new ones overwrite nothing.
 */
const blocksSaving = (problem: LoadProblem): boolean => problem.source !== "history";

/** What to tell the user about data that could not be read; null when all of it could. */
export function loadNotice(problems: readonly LoadProblem[]): Notice | null {
  if (problems.length === 0) return null;
  const what = problems.map((p) => `${STORED_NAMES[p.source]} (${p.detail})`).join("; ");
  const blocked = problems.filter(blocksSaving).map((p) => STORED_NAMES[p.source]);
  const consequence =
    blocked.length === 0
      ? ""
      : ` So that nothing is overwritten, changes to ${blocked.join(", ")} will not be saved` +
        " — restart the app, or import a backup to replace what is stored.";
  return {
    kind: "error",
    text: `Some saved data could not be read: ${what}. It is left untouched on disk.${consequence}`,
  };
}
