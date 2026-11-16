// Scenarios for the Today suite, built on the shared training world.

import { DEFAULT_SETTINGS, addDays } from "@nabd/domain";
import type { MapStyle, MapView } from "@nabd/view";
import { MuscleVolume } from "@nabd/coverage";
import { NudgePolicy } from "@nabd/nudge";
import type { NudgeStatus } from "@nabd/nudge";
import { buildTodayVM } from "@nabd/today";
import type { TodayVM } from "@nabd/today";
import { nov } from "../support/builders";
import { LIBRARY } from "../support/exercises";
import { did } from "../support/programs";
import { NOW, buildWorld } from "../support/world";
import type { WorldInput } from "../support/world";

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

/** Twelve chest sets last Friday: chest is well covered, the rest of the plan lags. */
export const benchWeek = () =>
  Array.from({ length: 12 }, (unused, i) => did(null, "bench", 8, 60, { at: nov(13, 12, i) }));

export interface TodayOptions {
  unit?: "kg" | "lb";
  nudge?: NudgeStatus;
  hasProgram?: boolean;
  mapView?: MapView;
  mapStyle?: MapStyle;
}

/** The Today view-model for a world, the way the app's container builds it. */
export function todayVM(input: WorldInput, options: TodayOptions = {}): TodayVM {
  const world = buildWorld(input);
  return buildTodayVM({
    plan: world.plan,
    coach: world.coach,
    stats: world.stats,
    nudge: options.nudge ?? nudgeAt(input.now ?? NOW),
    unit: options.unit ?? "kg",
    hasProgram: options.hasProgram ?? input.program.days.length > 0,
    coverage: MuscleVolume.ofRecentHistory(
      world.history,
      LIBRARY.lookup,
      addDays(world.now, 1),
    ).toCoverage(),
    planned: MuscleVolume.ofProgram(input.program, LIBRARY.lookup),
    mapView: options.mapView ?? "both",
    mapStyle: options.mapStyle ?? "heat",
  });
}
