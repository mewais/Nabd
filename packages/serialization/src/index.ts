// @nabd/serialization — validates (and migrates) a document before it is imported.

import type { AppData } from "@nabd/domain";
import { AppDataSchema, APPDATA_VERSION, isRecord } from "@nabd/domain";

export type ImportResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

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
 * Early builds had a third theme, "translucent": the dark theme over a glass
 * window. Glass is now a switch of its own, so that is what it becomes.
 * Anything else is returned untouched (the same object), for validation to judge.
 */
export function upgradeSettings(settings: unknown): unknown {
  if (!isRecord(settings) || settings.theme !== "translucent") return settings;
  return { ...settings, theme: "dark", glass: true };
}

/**
 * A rotation written before pools were tracked by exercise holds, per cycled
 * slot, a position in the slot's pool: turn each into the id of the exercise
 * at that position of `program`. A slot that is gone, or whose pool is empty,
 * loses its entry (the pool then starts from its first exercise). Anything
 * else is returned untouched (the same object), for validation to judge.
 */
export function upgradeRotation(rotation: unknown, program: unknown): unknown {
  if (!isRecord(rotation) || !Object.values(rotation).some((v) => typeof v === "number")) {
    return rotation;
  }
  const pools = new Map<unknown, unknown[]>();
  const days: unknown[] = isRecord(program) && Array.isArray(program.days) ? program.days : [];
  for (const day of days) {
    const slots: unknown[] = isRecord(day) && Array.isArray(day.slots) ? day.slots : [];
    for (const slot of slots) {
      if (isRecord(slot) && Array.isArray(slot.pool)) pools.set(slot.id, slot.pool);
    }
  }
  const upgraded: Record<string, unknown> = {};
  for (const [slotId, pointer] of Object.entries(rotation)) {
    const pool = pools.get(slotId) ?? [];
    const exId = typeof pointer === "number" ? pool[pointer % pool.length] : pointer;
    if (exId !== undefined) upgraded[slotId] = exId;
  }
  return upgraded;
}

/**
 * Bring an older export up to the current shape.
 * v1 → v2: the theme moved from a top-level field into `settings`.
 * Within v2: the "translucent" theme became dark + glass ({@link upgradeSettings}),
 * the floating position a day id ({@link upgradeDayState}) and each pool's
 * position an exercise id ({@link upgradeRotation}).
 */
function migrate(doc: Record<string, unknown>): Record<string, unknown> {
  const { theme, ...rest } = doc;
  if (theme !== undefined) {
    rest.settings = { ...(isRecord(rest.settings) ? rest.settings : {}), theme };
  }
  if (rest.settings !== undefined) rest.settings = upgradeSettings(rest.settings);
  if (rest.dayState !== undefined) rest.dayState = upgradeDayState(rest.dayState, rest.program);
  if (rest.rotationState !== undefined) {
    rest.rotationState = upgradeRotation(rest.rotationState, rest.program);
  }
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
