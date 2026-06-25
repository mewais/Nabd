// @nabd/serialization — pure import/export (de)serialization + migration.
// SKELETON: signatures frozen; bodies throw until implemented.

import type {
  AppData,
  Program,
  Exercise,
  Settings,
  Theme,
  LoggedSet,
  RotationState,
} from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

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
export function serialize(_input: SnapshotInput): AppData {
  return NI();
}

/** Serialize to a JSON string (2-space indent), matching nabd-data.json. */
export function serializeToJson(_input: SnapshotInput): string {
  return NI();
}

export interface DeserializeResult {
  ok: boolean;
  /** Validated, migrated partial state to merge in (only present fields). */
  data: Partial<SnapshotInput> & { theme?: Theme };
  errors: string[];
}

/** Parse + validate + migrate an unknown imported value. Bad fields are dropped. */
export function deserialize(_value: unknown): DeserializeResult {
  return NI();
}

/** Parse a JSON string then deserialize; never throws (errors reported). */
export function deserializeJson(_json: string): DeserializeResult {
  return NI();
}

/** Migrate an older AppData envelope to the current version. */
export function migrate(_data: AppData): AppData {
  return NI();
}
