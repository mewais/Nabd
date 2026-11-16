// @nabd/serialization — validates (and migrates) a document before it is imported.

import type { AppData } from "@nabd/domain";
import { AppDataSchema, APPDATA_VERSION } from "@nabd/domain";

export type ImportResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Day state written before floating days were tracked by id holds a position
 * (`floatingIndex`) instead: turn it into the id of the day at that position
 * of `program`. Anything else is returned untouched, for validation to judge.
 */
export function upgradeDayState(dayState: unknown, program: unknown): unknown {
  if (!isRecord(dayState) || "dayId" in dayState) return dayState;
  const { floatingIndex } = dayState;
  if (typeof floatingIndex !== "number") return dayState;
  const days: unknown[] = isRecord(program) && Array.isArray(program.days) ? program.days : [];
  const day = days[floatingIndex % days.length];
  return { ...dayState, dayId: isRecord(day) && typeof day.id === "string" ? day.id : null };
}

/**
 * Bring an older export up to the current shape.
 * v1 → v2: the theme moved from a top-level field into `settings`.
 * Within v2: the floating position became a day id (see {@link upgradeDayState}).
 */
function migrate(doc: Record<string, unknown>): Record<string, unknown> {
  const { theme, ...rest } = doc;
  if (theme !== undefined) {
    rest.settings = { ...(isRecord(rest.settings) ? rest.settings : {}), theme };
  }
  if (rest.dayState !== undefined) rest.dayState = upgradeDayState(rest.dayState, rest.program);
  return { ...rest, version: APPDATA_VERSION };
}

const isNewer = (version: unknown): boolean =>
  typeof version === "number" && version > APPDATA_VERSION;

/** Parse, migrate and validate an import file's text. Never throws. */
export function parseImport(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["This file is not valid JSON."] };
  }
  if (!isRecord(raw)) return { ok: false, errors: ["This file is not a Nabd export."] };
  if (isNewer(raw.version)) {
    // Reading it as the current format would silently drop whatever the newer app added.
    return {
      ok: false,
      errors: ["This file was exported by a newer version of Nabd. Update the app to import it."],
    };
  }

  const parsed = AppDataSchema.safeParse(migrate(raw));
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.errors.map((e) => `${e.path.join(".") || "document"}: ${e.message}`),
  };
}
