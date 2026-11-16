import { roundTo } from "@nabd/domain";
import { seriesScale } from "./series-scale";
import { FONT, tint } from "./tokens";

const BOX = { width: 680, height: 240, pad: 30 };
const BASELINE = BOX.height - BOX.pad;
const LEFT = BOX.pad;
const RIGHT = BOX.width - BOX.pad;

interface LineChartProps {
  /** The values, oldest first. */
  series: readonly number[];
  /** Describes the chart for assistive tech. */
  ariaLabel: string;
}

/** A value with at most one decimal. */
const tick = (value: number): string => String(roundTo(value, 1));

/** A filled trend line over three labelled gridlines: the series' high, middle and low. */
export function LineChart({ series, ariaLabel }: LineChartProps): JSX.Element {
  const scale = seriesScale(series, BOX);
  const levels = [scale.max, (scale.max + scale.min) / 2, scale.min];

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height: "auto", display: "block", fontFamily: FONT.mono }}
    >
      {levels.map((level, index) => (
        <g key={index}>
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={scale.y(level)}
            y2={scale.y(level)}
            stroke="var(--line)"
            strokeWidth={1}
          />
          <text x={6} y={scale.y(level)} dy={4} fill="var(--text3)" fontSize={11}>
            {tick(level)}
          </text>
        </g>
      ))}
      <polygon
        points={`${LEFT},${BASELINE} ${scale.points} ${RIGHT},${BASELINE}`}
        fill={tint("var(--accent)", 12)}
        stroke="none"
      />
      <polyline
        points={scale.points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
