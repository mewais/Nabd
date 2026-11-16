import type { CSSProperties } from "react";
import { clamp } from "@nabd/domain";
import { CENTERED } from "./styles";
import { COLOR, RADIUS, TEXT } from "./tokens";

interface ProgressRingProps {
  /** How far round the ring is filled, 0–100 (clamped). */
  pct: number;
  /** The figure in the middle. */
  value: string | number;
  /** What the figure counts, under it. */
  caption: string;
  /** The whole reading in words: "2 of 7 sets done today". */
  ariaLabel: string;
}

const SIZE = 108;
const WIDTH = 9;

const DISC: CSSProperties = { ...CENTERED, flexDirection: "column", borderRadius: RADIUS.round };

/** A ring that fills as something gets done, with the count in the middle. */
export function ProgressRing({ pct, value, caption, ariaLabel }: ProgressRingProps): JSX.Element {
  const filled = clamp(pct, 0, 100);
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{
        ...DISC,
        width: SIZE,
        height: SIZE,
        background: `conic-gradient(${COLOR.accent} ${filled}%, ${COLOR.line} ${filled}%)`,
      }}
    >
      <div
        style={{
          ...DISC,
          width: SIZE - 2 * WIDTH,
          height: SIZE - 2 * WIDTH,
          background: COLOR.surface,
        }}
      >
        <span style={{ ...TEXT.stat, lineHeight: 1 }}>{value}</span>
        <span style={TEXT.caption}>{caption}</span>
      </div>
    </div>
  );
}
