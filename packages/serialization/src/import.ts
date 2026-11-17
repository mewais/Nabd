import type { AppData } from "@nabd/domain";
import { AppDataSchema, APPDATA_VERSION, isRecord } from "@nabd/domain";
import { upgradeStored } from "./upgrades";

type ImportResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

/**
 * Bring an older export up to the current shape.
 *  - v1 → v2: the theme moved from a top-level field into `settings`.
 *  - v2 → v3: prescribed sets took their present field names.
 *  - v3 → v4: the day state tracks the sets an unfinished floating day already
 *    has behind it (`carried`) and the settings the weekdays that are worked
 *    (`workDays`); a document without them takes their defaults on validation,
 *    which is the whole upgrade.
 *  - v4 → v5: a carried set knows its kind and its exercise, and the visit
 *    the date it began (upgraded from the counts, see {@link upgradeStored});
 *    a logged set knows the session it belongs to, which for a set without
 *    one is its own date, and the settings hold the user's body weight,
 *    unknown unless given — both defaults taken on validation.
 *  - v5 → v6: the day state says whether the day was skipped or nudged on
 *    (`override`), and a day on record whether it was optional (`optional`);
 *    without them a day is neither, the defaults taken on validation.
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
