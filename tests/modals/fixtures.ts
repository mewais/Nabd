// Scenarios for the logger suite: a real plan + coach + draft session.

import type { WeightUnit } from "@nabd/domain";
import { LogSession } from "@nabd/session";
import { buildSessionVM } from "@nabd/modals";
import type { SessionVM } from "@nabd/modals";
import { NOW, buildWorld } from "../support/plan-fixtures";
import type { WorldInput } from "../support/plan-fixtures";

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
