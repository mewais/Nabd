import { COLOR, RADIUS, SPACE, toneColor } from "./tokens";
import type { Tone } from "./tokens";

/** One share of the whole. */
interface SplitSegment {
  /** Tells the segments apart. */
  key: string;
  /** Its share of the bar, 0–100. */
  pct: number;
  tone: Tone;
}

interface SplitBarProps {
  segments: readonly SplitSegment[];
}

const HEIGHT = 32;

/**
 * One bar cut into toned shares. Decorative: list what each tone stands for,
 * with its figure, beside it.
 */
export function SplitBar({ segments }: SplitBarProps): JSX.Element {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        gap: SPACE.xxs,
        height: HEIGHT,
        borderRadius: RADIUS.chip,
        overflow: "hidden",
      }}
    >
      {segments.map(({ key, pct, tone }) => (
        <div
          key={key}
          style={{ width: `${pct}%`, background: toneColor(tone) ?? COLOR.surfaceAlt }}
        />
      ))}
    </div>
  );
}
