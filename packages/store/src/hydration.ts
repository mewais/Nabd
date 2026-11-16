import { z } from "zod";
import type { ZodTypeAny } from "zod";
import type { Notice } from "@nabd/domain";
import {
  DayLogSchema,
  DayStateSchema,
  EMPTY_PROGRAM,
  ExerciseSchema,
  LoggedSetSchema,
  ProgramSchema,
  RotationStateSchema,
  freshDayState,
  plural,
  salvageSettings,
} from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import type { BootSnapshot, Singletons } from "@nabd/ipc-client";
import { normalized } from "@nabd/program-editor";
import { upgradeDayState, upgradeRotation, upgradeSettings } from "@nabd/serialization";
import type { LoadProblem, NabdState } from "./state";

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

/** What the boot snapshot held, read into state. */
export interface Loaded {
  state: Persisted;
  problems: LoadProblem[];
  /**
   * Stored values that were readable but not in today's shape (an older
   * version's, or breaking a rule) and were put right in reading: they are
   * written back, so the stored copy is put right too.
   */
  repaired: (keyof Singletons)[];
  /** Settings that could not be kept and are back at their defaults. */
  resetSettings: string[];
}

/**
 * Turn the raw boot snapshot into validated state. A value that was never
 * saved takes its default. The plan, the custom exercises and the logs are
 * all-or-nothing: an invalid one also runs on its default, and is reported so
 * the store can keep from saving over it. Settings are independent of each
 * other, so they are salvaged field by field and stay writable.
 */
export function readSnapshot(snapshot: BootSnapshot, now: Date): Loaded {
  const problems: LoadProblem[] = [];
  const repaired: (keyof Singletons)[] = [];

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

  /**
   * History is validated row by row: one bad set must not hide all the
   * others. The backend does the same, and says how many rows it had to skip.
   */
  function readHistory(rows: unknown[], skippedByBackend: number): Persisted["history"] {
    const sets = rows.flatMap((row) => {
      const parsed = LoggedSetSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    });
    const unreadable = rows.length - sets.length + skippedByBackend;
    if (unreadable > 0) {
      problems.push({ source: "history", detail: `${plural(unreadable, "set")} left out` });
    }
    return sets;
  }

  const storedSettings = upgradeSettings(snapshot.settings);
  const { settings, reset: resetSettings } = salvageSettings(storedSettings);
  if (storedSettings !== snapshot.settings || resetSettings.length > 0) repaired.push("settings");

  const customExercises = read(
    "customExercises",
    z.array(ExerciseSchema),
    snapshot.customExercises,
    [],
  );
  const storedProgram = read("program", ProgramSchema, snapshot.program, EMPTY_PROGRAM);
  const { lookup } = ExerciseLibrary.catalog.withCustom(customExercises);
  const program = normalized(storedProgram, lookup);
  if (program !== storedProgram) repaired.push("program");

  const storedRotation = upgradeRotation(snapshot.rotationState, snapshot.program);
  if (storedRotation !== snapshot.rotationState) repaired.push("rotationState");

  const state: Persisted = {
    settings,
    program,
    customExercises,
    rotationState: read("rotationState", RotationStateSchema, storedRotation, {}),
    dayState: read(
      "dayState",
      DayStateSchema,
      upgradeDayState(snapshot.dayState, snapshot.program),
      freshDayState(now),
    ),
    dayLog: read("dayLog", DayLogSchema, snapshot.dayLog, []),
    history: readHistory(snapshot.history, snapshot.unreadableSets ?? 0),
  };
  return { state, problems, repaired, resetSettings };
}

/**
 * Whether a problem stops its value from being saved. Unreadable history rows
 * do not: sets are stored one row each, so new ones overwrite nothing.
 */
const blocksSaving = (problem: LoadProblem): boolean => problem.source !== "history";

/** What to tell the user about data that could not be read; null when all of it could. */
function unreadableNotice(problems: readonly LoadProblem[]): string | null {
  if (problems.length === 0) return null;
  const what = problems.map((p) => `${STORED_NAMES[p.source]} (${p.detail})`).join("; ");
  const blocked = problems.filter(blocksSaving).map((p) => STORED_NAMES[p.source]);
  const consequence =
    blocked.length === 0
      ? ""
      : ` So that nothing is overwritten, changes to ${blocked.join(", ")} will not be saved` +
        " — import a backup to replace what is stored.";
  return `Some saved data could not be read: ${what}. It is left untouched on disk.${consequence}`;
}

/** What to tell the user about how the load went; null when there is nothing to tell. */
export function loadNotice(
  problems: readonly LoadProblem[],
  resetSettings: readonly string[] = [],
): Notice | null {
  const unreadable = unreadableNotice(problems);
  const reset =
    resetSettings.length === 0
      ? null
      : `These settings could not be read and are back at their defaults: ${resetSettings.join(", ")}.`;
  if (unreadable === null && reset === null) return null;
  return {
    kind: unreadable === null ? "info" : "error",
    text: [unreadable, reset].filter((part) => part !== null).join(" "),
  };
}
