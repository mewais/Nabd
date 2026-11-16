// Scenarios for the modal suites: a real plan + coach + draft session for the
// logger, and real trends from logged sets for the full-history chart.

import type { LoggedSet, WeightUnit } from "@nabd/domain";
import { buildSessionVM } from "@nabd/modals";
import type { SessionVM } from "@nabd/modals";
import { ExerciseProgress } from "@nabd/progression";
import type { ExerciseTrend } from "@nabd/progression";
import { LogSession } from "@nabd/session";
import { nov } from "../support/builders";
import { LIBRARY } from "../support/exercises";
import type { ExKey } from "../support/exercises";
import { did } from "../support/programs";
import { NOW, buildWorld } from "../support/world";
import type { WorldInput } from "../support/world";

/**
 * Open the logger on plan item `itemId` the way the app does: pre-filled by
 * the coach with what the user did last.
 */
export function openSession(input: WorldInput, itemId: string) {
  const world = buildWorld(input);
  const item = world.plan.item(itemId);
  if (!item) throw new Error(`"${itemId}" is not in today's plan`);
  const session = LogSession.open(item, world.coach.startFor(item), "manual");
  return { ...world, item, session };
}

/** The logger's view-model for `itemId`; throws if the builder returns null. */
export function sessionVM(
  input: WorldInput,
  itemId: string,
  options: { unit?: WeightUnit; now?: Date; unsaved?: string[] } = {},
): SessionVM {
  const { session, plan, coach } = openSession(input, itemId);
  const vm = buildSessionVM({
    session,
    plan,
    coach,
    unit: options.unit ?? "kg",
    now: options.now ?? input.now ?? NOW,
    unsaved: options.unsaved ?? [],
  });
  if (vm === null) throw new Error("expected a session view-model");
  return vm;
}

/** The trend of `ex` over `history`; throws if it has none. */
export function trendOf(history: LoggedSet[], ex: ExKey): ExerciseTrend {
  const trend = new ExerciseProgress(history, LIBRARY.lookup).trendOf(ex);
  if (!trend) throw new Error(`no trend for "${ex}"`);
  return trend;
}

/** Three bench sessions; each session's best set is an e1RM of 76 → 78 → 79.2 kg. */
export const benchHistory = (): LoggedSet[] => [
  did(null, "bench", 8, 60, { at: nov(2) }),
  did(null, "bench", 6, 60, { at: nov(2) }),
  did(null, "bench", 9, 60, { at: nov(9) }),
  did(null, "bench", 8, 62.5, { at: nov(16) }),
];
