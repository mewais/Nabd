import type { TrainingStats } from "@nabd/analytics";
import type { BarDatum } from "@nabd/design-system";
import { relativeHeights } from "./bars";
import { buildEmptyVM } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import { NOTHING_LOGGED, hourLabel } from "./wording";

export interface TimeOfDayVM {
  /** "Peak 9a". */
  peak: string;
  bars: BarDatum[];
}

/** The time-of-day chart captions every third hour; 24 captions do not fit. */
const HOUR_CAPTION_EVERY = 3;

/** Sets by hour of the day, with the busiest hour called out. */
export function buildTimeOfDayVM(stats: TrainingStats): TimeOfDayVM | EmptyVM {
  const { buckets, peak } = stats.timeOfDay();
  if (peak === null) return buildEmptyVM(`${NOTHING_LOGGED} Your busiest hours show up here.`);
  const heights = relativeHeights(buckets.map((bucket) => bucket.count));
  return {
    peak: `Peak ${hourLabel(peak)}`,
    bars: buckets.map(({ hour }, index) => ({
      label: hour % HOUR_CAPTION_EVERY === 0 ? hourLabel(hour) : "",
      heightPct: heights[index] ?? 0,
      highlight: hour === peak,
    })),
  };
}
