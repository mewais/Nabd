// Every shape an older version stored or exported, brought to today's. Each
// upgrade returns what it was given — the same object — when there is nothing
// to do, and leaves anything it does not recognise for validation to judge.

import { isRecord } from "@nabd/domain";
import { upgradeDayState } from "./upgrade-day-state";
import { upgradeProgram } from "./upgrade-program";
import { upgradeRotation } from "./upgrade-rotation";

/**
 * Early builds had a third theme, "translucent": the dark theme over a glass
 * window. Glass is now a switch of its own, so that is what it becomes.
 */
function upgradeSettings(settings: unknown): unknown {
  if (!isRecord(settings) || settings.theme !== "translucent") return settings;
  return { ...settings, theme: "dark", glass: true };
}

/** The stored values an upgrade can touch, as they were read: none of them validated yet. */
interface StoredValues {
  program?: unknown;
  settings?: unknown;
  dayState?: unknown;
  rotationState?: unknown;
}

/**
 * `stored` in today's shape: every upgrade above, applied to whichever of the
 * values is present. A value that needed no upgrade is the same object as
 * before, so a caller can tell what changed.
 */
export function upgradeStored<T extends StoredValues>(stored: T): T {
  const has = (value: unknown): boolean => value !== undefined && value !== null;
  const upgraded = { ...stored };
  // Positions in the rotation refer to the program as it was stored; the day state is read
  // against both as upgraded (upgrading a program never moves its days or sets).
  if (has(stored.rotationState)) {
    upgraded.rotationState = upgradeRotation(stored.rotationState, stored.program);
  }
  if (has(stored.settings)) upgraded.settings = upgradeSettings(stored.settings);
  if (has(stored.program)) upgraded.program = upgradeProgram(stored.program);
  if (has(stored.dayState)) {
    upgraded.dayState = upgradeDayState(stored.dayState, upgraded.program, upgraded.rotationState);
  }
  return upgraded;
}
