// Scenarios for the Today suite, built on the shared training world.

import { DEFAULT_SETTINGS } from "@nabd/domain";
import { NudgePolicy } from "@nabd/nudge";
import type { NudgeStatus } from "@nabd/nudge";
import { buildTodayVM } from "@nabd/today";
import type { TodayVM } from "@nabd/today";
import { NOW, buildWorld } from "../support/plan-fixtures";
import type { WorldInput } from "../support/plan-fixtures";

export { lastWeek, pushDay } from "../support/plan-fixtures";

/** Where nudging stands at `now` under the default settings, straight from the policy. */
export function nudgeAt(
  now: Date,
  ctx: { lastSetAt?: Date | null; paused?: boolean; hasWork?: boolean } = {},
): NudgeStatus {
  return new NudgePolicy(DEFAULT_SETTINGS).evaluate({
    now,
    lastSetAt: ctx.lastSetAt ?? null,
    activeSince: null,
    snoozedUntil: null,
    idleSeconds: 0,
    paused: ctx.paused ?? false,
    hasWork: ctx.hasWork ?? true,
  });
}

/** The Today view-model for a world, the way the app's container builds it. */
export function todayVM(
  input: WorldInput,
  options: { unit?: "kg" | "lb"; nudge?: NudgeStatus; hasProgram?: boolean } = {},
): TodayVM {
  const world = buildWorld(input);
  return buildTodayVM({
    plan: world.plan,
    coach: world.coach,
    stats: world.stats,
    nudge: options.nudge ?? nudgeAt(input.now ?? NOW),
    unit: options.unit ?? "kg",
    hasProgram: options.hasProgram ?? input.program.days.length > 0,
  });
}
