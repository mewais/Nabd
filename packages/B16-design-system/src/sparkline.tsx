import { seriesScale } from "./series-scale";

/** SVG polyline points for `series` drawn inside a `width`×`height` box, `pad` px in from each edge. */
export function polylinePoints(
  series: readonly number[],
  width: number,
  height: number,
  pad: number,
): string {
  const scale = seriesScale(series, { width, height, pad });
  return series
    .map((value, index) => `${scale.x(index).toFixed(1)},${scale.y(value).toFixed(1)}`)
    .join(" ");
}

const BOX = { width: 120, height: 34, pad: 5 };

export interface SparklineProps {
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
        points={polylinePoints(series, BOX.width, BOX.height, BOX.pad)}
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
