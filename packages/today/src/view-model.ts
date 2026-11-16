// Pure builders: domain objects in, exactly what the Today screen renders out.

import type { Coverage, WeightUnit } from "@nabd/domain";
import { MUSCLE_NAMES, inUnit, isWarmup, plural } from "@nabd/domain";
import type { MuscleVolume } from "@nabd/coverage";
import type { TodayPlan } from "@nabd/scheduling";
import type { Coach } from "@nabd/session";
import type { NudgeStatus } from "@nabd/nudge";
import type { TrainingStats } from "@nabd/analytics";
import type { MapStyle, MapView } from "@nabd/domain";
import { buildCoverage, buildInsight } from "./coverage-vm";
import type { CoverageVM, InsightRowVM } from "./coverage-vm";
import { buildHero } from "./hero-vm";
import type { HeroVM } from "./hero-vm";
import { buildQueue } from "./queue-vm";
import type { QueueRowVM } from "./queue-vm";

export interface StatTileVM {
  label: string;
  /** The figure, grouped for reading: "1,250". */
  value: string;
  unit: string;
}

export interface TodayVM {
  hero: HeroVM;
  dayName: string | null;
  queue: QueueRowVM[];
  /** Cycled muscle targets left out of the queue because their pool is empty; null when none. */
  emptySlotsNote: string | null;
  coverage: CoverageVM;
  insight: InsightRowVM[];
  stats: StatTileVM[];
}

export interface TodayInput {
  plan: TodayPlan;
  coach: Coach;
  nudge: NudgeStatus;
  stats: TrainingStats;
  unit: WeightUnit;
  hasProgram: boolean;
  /** What was trained over the last week, 0–100 per muscle. */
  coverage: Coverage;
  /** What the program trains, to tell a lagging muscle from one never targeted. */
  planned: MuscleVolume;
  mapView: MapView;
  mapStyle: MapStyle;
}

/** "2 muscle targets have no exercises yet: Chest, Lats". */
function emptySlotsNote(plan: TodayPlan): string | null {
  const muscles = plan.emptySlots.map((m) => MUSCLE_NAMES[m]);
  if (muscles.length === 0) return null;
  const count = plural(muscles.length, "muscle target");
  return `${count} ${muscles.length === 1 ? "has" : "have"} no exercises yet: ${muscles.join(", ")}`;
}

/** Total load moved today (reps × weight, warm-ups left out), in the display unit. */
function volumeToday(plan: TodayPlan, unit: WeightUnit): number {
  const kg = plan.items
    .flatMap((item) => item.logged)
    .filter((set) => !isWarmup(set))
    .reduce((sum, set) => sum + set.value * (set.weight ?? 0), 0);
  return Math.round(inUnit(kg, unit));
}

function buildStats(plan: TodayPlan, stats: TrainingStats, unit: WeightUnit): StatTileVM[] {
  const tile = (label: string, value: number, unit: string): StatTileVM => ({
    label,
    value: value.toLocaleString("en-US"),
    unit,
  });
  return [
    tile("Streak", stats.streak(), "days"),
    tile("This week", stats.setsThisWeek(), "sets"),
    tile("Lifted today", volumeToday(plan, unit), unit),
  ];
}

export function buildTodayVM(input: TodayInput): TodayVM {
  const { plan, stats, unit, coverage } = input;
  return {
    hero: buildHero(input),
    dayName: plan.dayName,
    queue: buildQueue(plan),
    emptySlotsNote: emptySlotsNote(plan),
    coverage: buildCoverage(coverage, input.planned, input.mapView, input.mapStyle),
    insight: buildInsight(coverage, input.planned),
    stats: buildStats(plan, stats, unit),
  };
}
