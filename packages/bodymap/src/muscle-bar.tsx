import type { MuscleStanding, Recommendation } from "@nabd/coverage";
import { MUSCLE_NAMES } from "@nabd/domain";
import { MeterBar } from "@nabd/design-system";
import type { Tone } from "@nabd/design-system";
import { RECOMMENDATION_NAMES, coverageLabel } from "./wording";

/** One muscle's standing, as the coverage engine reports it. */
type MuscleBarProps = MuscleStanding;

/** The colour a recommendation is shown in, wherever it appears. */
export const RECOMMENDATION_TONES: Record<Recommendation, Tone> = {
  rest: "info",
  push: "accent",
  none: "neutral",
};

/** One muscle's coverage as a meter, tagged "Rest" or "Push" when it stands out. */
export function MuscleBar({ muscle, pct, recommendation }: MuscleBarProps): JSX.Element {
  return (
    <MeterBar
      label={MUSCLE_NAMES[muscle]}
      pct={pct}
      value={coverageLabel(pct)}
      tag={RECOMMENDATION_NAMES[recommendation]}
      tagTone={RECOMMENDATION_TONES[recommendation]}
    />
  );
}
