import type { MuscleStanding, Recommendation } from "@nabd/coverage";
import { MUSCLE_NAMES } from "@nabd/domain";
import { Eyebrow, MeterBar } from "@nabd/design-system";
import type { Tone } from "@nabd/design-system";

/** One muscle's standing, as the coverage engine reports it. */
type MuscleBarProps = MuscleStanding;

/** What a recommendation is called, where it is worth saying. */
const RECOMMENDATION_NAMES: Record<Recommendation, string> = {
  rest: "Rest",
  push: "Push",
  none: "",
};

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
      value={`${Math.round(pct)}%`}
      trailing={
        <Eyebrow
          tone={RECOMMENDATION_TONES[recommendation]}
          style={{ width: 38, flex: "none", textAlign: "right" }}
        >
          {RECOMMENDATION_NAMES[recommendation]}
        </Eyebrow>
      }
    />
  );
}
