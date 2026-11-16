// Pure builder: domain objects in, exactly what the Today screen renders out.

import type { TrainingStats } from "@nabd/analytics";
import type { MuscleVolume } from "@nabd/coverage";
import type { StatFigure } from "@nabd/design-system";
import type { Coverage, WeightUnit } from "@nabd/domain";
import { formatMuscles, inUnit, plural } from "@nabd/domain";
import type { TodayPlan } from "@nabd/scheduling";
import type { MapStyle, MapView } from "@nabd/view";
import { buildCoverageVM, buildInsightVM } from "./coverage-vm";
import type { CoverageVM, InsightRowVM } from "./coverage-vm";
import { buildHeroVM } from "./hero-vm";
import type { HeroInput, HeroVM } from "./hero-vm";
import { buildQueueVM } from "./queue-vm";
import type { QueueVM } from "./queue-vm";

export interface TodayVM {
  hero: HeroVM;
  queue: QueueVM;
  /** Cycled muscle targets left out of the queue because their pool is empty; null when none. */
  emptySlotsNote: string | null;
  coverage: CoverageVM;
  insight: InsightRowVM[];
  stats: StatFigure[];
}

interface TodayInput extends HeroInput {
  stats: TrainingStats;
  /** What was trained over the last week, 0–100 per muscle. */
  coverage: Coverage;
  /** What the program trains, to tell a lagging muscle from one never targeted. */
  planned: MuscleVolume;
  mapView: MapView;
  mapStyle: MapStyle;
}

/** "2 muscle targets have no exercises yet: Chest, Lats". */
function emptySlotsNote(plan: TodayPlan): string | null {
  const count = plan.emptySlots.length;
  if (count === 0) return null;
  const targets = `${plural(count, "muscle target")} ${count === 1 ? "has" : "have"}`;
  return `${targets} no exercises yet: ${formatMuscles(plan.emptySlots)}`;
}

function buildStats(plan: TodayPlan, stats: TrainingStats, unit: WeightUnit): StatFigure[] {
  const figure = (label: string, value: number, unit: string): StatFigure => ({
    label,
    value: value.toLocaleString("en-US"),
    unit,
  });
  return [
    figure("Streak", stats.streak(), "days"),
    figure("This week", stats.setsThisWeek(), "sets"),
    figure("Lifted today", Math.round(inUnit(plan.loadLifted, unit)), unit),
  ];
}

export function buildTodayVM(input: TodayInput): TodayVM {
  const { plan, stats, unit, coverage } = input;
  return {
    hero: buildHeroVM(input),
    queue: buildQueueVM(plan),
    emptySlotsNote: emptySlotsNote(plan),
    coverage: buildCoverageVM(coverage, input.planned, input.mapView, input.mapStyle),
    insight: buildInsightVM(coverage, input.planned),
    stats: buildStats(plan, stats, unit),
  };
}
