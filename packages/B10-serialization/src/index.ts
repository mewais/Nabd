// @nabd/serialization — validates (and migrates) a document before it is imported.

import type { AppData } from "@nabd/domain";
import { AppDataSchema, APPDATA_VERSION } from "@nabd/domain";

export type ImportResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Bring an older export up to the current shape.
 * v1 → v2: the theme moved from a top-level field into `settings`.
 */
function migrate(doc: Record<string, unknown>): Record<string, unknown> {
  const { theme, ...rest } = doc;
  if (theme !== undefined) {
    rest.settings = { ...(isRecord(rest.settings) ? rest.settings : {}), theme };
  }
  return { ...rest, version: APPDATA_VERSION };
}

/** Parse, migrate and validate an import file's text. Never throws. */
export function parseImport(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["This file is not valid JSON."] };
  }
  if (!isRecord(raw)) return { ok: false, errors: ["This file is not a Nabd export."] };

  const parsed = AppDataSchema.safeParse(migrate(raw));
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.errors.map((e) => `${e.path.join(".") || "document"}: ${e.message}`),
  };
}
