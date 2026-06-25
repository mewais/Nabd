// @nabd/serialization — pure import/export (de)serialization + migration.

import type {
  AppData,
  Program,
  Exercise,
  Settings,
  Theme,
  LoggedSet,
  RotationState,
} from "@nabd/domain";
import { AppDataSchema, APPDATA_VERSION } from "@nabd/domain";

export interface SnapshotInput {
  program: Program;
  customExercises: Exercise[];
  settings: Settings;
  theme: Theme;
  history: LoggedSet[];
  rotationState: RotationState;
  exportedAt: string;
}

/** Build the export envelope (stable, pretty-serializable). */
export function serialize(input: SnapshotInput): AppData {
  return {
    app: "Nabd",
    version: APPDATA_VERSION,
    exportedAt: input.exportedAt,
    program: input.program,
    customExercises: input.customExercises,
    settings: input.settings,
    theme: input.theme,
    history: input.history,
    rotationState: input.rotationState,
  };
}

/** Serialize to a JSON string (2-space indent), matching nabd-data.json. */
export function serializeToJson(input: SnapshotInput): string {
  return JSON.stringify(serialize(input), null, 2);
}

export interface DeserializeResult {
  ok: boolean;
  /** Validated, migrated partial state to merge in (only present fields). */
  data: Partial<SnapshotInput> & { theme?: Theme };
  errors: string[];
}

/** Parse + validate + migrate an unknown imported value. Bad fields are dropped. */
export function deserialize(value: unknown): DeserializeResult {
  const parsed = AppDataSchema.safeParse(value);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => e.message);
    return { ok: false, data: {}, errors };
  }
  const migrated = migrate(parsed.data);
  const data: Partial<SnapshotInput> & { theme?: Theme } = {};
  if (migrated.program !== undefined) data.program = migrated.program;
  if (migrated.customExercises !== undefined) data.customExercises = migrated.customExercises;
  if (migrated.settings !== undefined) data.settings = migrated.settings as Settings;
  if (migrated.theme !== undefined) data.theme = migrated.theme;
  if (migrated.history !== undefined) data.history = migrated.history;
  if (migrated.rotationState !== undefined) data.rotationState = migrated.rotationState;
  return { ok: true, data, errors: [] };
}

/** Parse a JSON string then deserialize; never throws (errors reported). */
export function deserializeJson(json: string): DeserializeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, data: {}, errors: ["invalid json"] };
  }
  return deserialize(parsed);
}

/** Migrate an older AppData envelope to the current version. */
export function migrate(data: AppData): AppData {
  // v1 is current; identity transform — structure ready for future versions.
  return { ...data, version: APPDATA_VERSION };
}
