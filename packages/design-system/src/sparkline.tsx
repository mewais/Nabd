import { seriesScale } from "./series-scale";

const BOX = { width: 120, height: 34, pad: 5 };

interface SparklineProps {
  /** The values, oldest first. */
  series: readonly number[];
  /** Describes the trend for assistive tech. */
  ariaLabel?: string;
}

/** A small trend line that stretches to its container's width. */
export function Sparkline({ series, ariaLabel }: SparklineProps): JSX.Element {
  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height: BOX.height, overflow: "visible" }}
    >
      <polyline
        points={seriesScale(series, BOX).points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
