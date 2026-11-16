import type { ZodTypeAny, z } from "zod";
import {
  CustomExercisesSchema,
  DayLogSchema,
  DayStateSchema,
  EMPTY_PROGRAM,
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
import { upgradeStored } from "@nabd/serialization";
import type { Notice } from "@nabd/view";
import { STORED_NAMES } from "./persistence";
import type { LoadProblem, NabdState } from "./state";

type Persisted = Pick<NabdState, keyof Singletons | "history">;

const SINGLETONS = [
  "program",
  "settings",
  "customExercises",
  "rotationState",
  "dayState",
  "dayLog",
] as const satisfies readonly (keyof Singletons)[];

/** What the boot snapshot held, read into state. */
interface Loaded {
  state: Persisted;
  problems: LoadProblem[];
  /**
   * Stored values that were readable but not in today's shape (an older
   * version's — see @nabd/serialization — or breaking a rule) and were put
   * right in reading: they are written back, so the stored copy is put right too.
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
  const stored = upgradeStored(snapshot);
  const repaired = new Set(SINGLETONS.filter((key) => stored[key] !== snapshot[key]));

  function read<S extends ZodTypeAny>(
    source: keyof Singletons,
    schema: S,
    value: unknown,
    fallback: z.output<S>,
  ): z.output<S> {
    if (value === null || value === undefined) return fallback;
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;
    const [issue] = parsed.error.errors;
    const where = issue?.path.join(".") || "value";
    problems.push({ source, detail: `${where}: ${issue?.message ?? "not valid"}` });
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

  const { settings, reset: resetSettings } = salvageSettings(stored.settings);
  if (resetSettings.length > 0) repaired.add("settings");

  const customExercises = read(
    "customExercises",
    CustomExercisesSchema,
    stored.customExercises,
    [],
  );
  const storedProgram = read("program", ProgramSchema, stored.program, EMPTY_PROGRAM);
  const { lookup } = ExerciseLibrary.catalog.withCustom(customExercises);
  const program = normalized(storedProgram, lookup);
  if (program !== storedProgram) repaired.add("program");

  const state: Persisted = {
    settings,
    program,
    customExercises,
    rotationState: read("rotationState", RotationStateSchema, stored.rotationState, {}),
    dayState: read("dayState", DayStateSchema, stored.dayState, freshDayState(now)),
    dayLog: read("dayLog", DayLogSchema, stored.dayLog, []),
    history: readHistory(stored.history, stored.unreadableSets ?? 0),
  };
  return { state, problems, repaired: [...repaired], resetSettings };
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
