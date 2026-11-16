import type { Recommendation } from "@nabd/coverage";
import { MUSCLE_NAMES, type MuscleKey } from "@nabd/domain";
import { FONT, MeterBar } from "@nabd/design-system";

export interface MuscleBarProps {
  muscle: MuscleKey;
  /** Coverage, 0–100. */
  pct: number;
  /** Whether the muscle is due a rest or a push (from the coverage engine). */
  recommendation: Recommendation;
}

const TAGS: Record<Recommendation, { text: string; color: string }> = {
  rest: { text: "Rest", color: "var(--accent3)" },
  push: { text: "Push", color: "var(--accent)" },
  none: { text: "", color: "var(--text3)" },
};

/** One muscle's coverage as a meter, tagged "Rest" or "Push" when it stands out. */
export function MuscleBar({ muscle, pct, recommendation }: MuscleBarProps): JSX.Element {
  const tag = TAGS[recommendation];
  return (
    <MeterBar
      label={MUSCLE_NAMES[muscle]}
      pct={pct}
      value={`${Math.round(pct)}%`}
      trailing={
        <span
          style={{
            width: 38,
            flex: "none",
            textAlign: "right",
            fontFamily: FONT.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: tag.color,
          }}
        >
          {tag.text}
        </span>
      }
    />
  );
}
