import type { AppData } from "@nabd/domain";
import { AppDataSchema, APPDATA_VERSION, isRecord } from "@nabd/domain";
import { upgradeStored } from "./upgrades";

type ImportResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

/**
 * Bring an older export up to the current shape.
 *  - v1 → v2: the theme moved from a top-level field into `settings`.
 *  - v2 → v3: prescribed sets took their present field names.
 *  - Whatever the version, the values an export shares with what the app
 *    stores are upgraded the same way ({@link upgradeStored}).
 */
function migrate(doc: Record<string, unknown>): Record<string, unknown> {
  const { theme, ...rest } = doc;
  if (theme !== undefined) {
    rest.settings = { ...(isRecord(rest.settings) ? rest.settings : {}), theme };
  }
  return { ...upgradeStored(rest), version: APPDATA_VERSION };
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
