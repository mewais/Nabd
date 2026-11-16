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
} from "@nabd/domain";
import type { BootSnapshot } from "@nabd/ipc-client";
import { freshDayState, type NabdState } from "./state";

type Persisted = Pick<
  NabdState,
  "settings" | "program" | "customExercises" | "rotationState" | "dayState" | "dayLog" | "history"
>;

/** A stored value if it is valid, else the fallback — bad data never blocks boot. */
function valid<S extends ZodTypeAny>(
  schema: S,
  value: unknown,
  fallback: z.output<S>,
): z.output<S> {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

/** Turn the raw boot snapshot into validated state, defaulting whatever is missing. */
export function readSnapshot(snapshot: BootSnapshot, now: Date): Persisted {
  const storedSettings = typeof snapshot.settings === "object" ? snapshot.settings : {};
  return {
    // Settings saved by an older version lack newer fields: fill them from the defaults.
    settings: valid(SettingsSchema, { ...DEFAULT_SETTINGS, ...storedSettings }, DEFAULT_SETTINGS),
    program: valid(ProgramSchema, snapshot.program, EMPTY_PROGRAM),
    customExercises: valid(z.array(ExerciseSchema), snapshot.customExercises, []),
    rotationState: valid(RotationStateSchema, snapshot.rotationState, {}),
    dayState: valid(DayStateSchema, snapshot.dayState, freshDayState(now)),
    dayLog: valid(DayLogSchema, snapshot.dayLog, []),
    history: valid(z.array(LoggedSetSchema), snapshot.history, []),
  };
}
