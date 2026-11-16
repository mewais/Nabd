import type { CSSProperties } from "react";
import { COLUMN, GROW, ROW } from "./styles";
import { COLOR, RADIUS, SPACE, TEXT, shade } from "./tokens";
import type { Size, Tone } from "./tokens";

export interface BarDatum {
  /** The caption under the bar; may be blank where only some bars are captioned. */
  label: string;
  /** Bar height as a share of the chart, 0–100. */
  heightPct: number;
  /** The figure printed above the bar, if any. */
  value?: string;
  /** Draw this bar in the full accent (the current day, the peak hour…). */
  highlight?: boolean;
}

/** What the bars that are not highlighted look like. */
type BarTone = Extract<Tone, "neutral" | "accent" | "success">;

interface BarChartProps {
  bars: readonly BarDatum[];
  /** `sm` under a headline figure, `lg` when the chart is the card. */
  size?: Extract<Size, "sm" | "md" | "lg">;
  tone?: BarTone;
  /** Names the chart for assistive tech. */
  ariaLabel: string;
}

/** Chart heights in px, captions included. */
const HEIGHT = { sm: 88, md: 124, lg: 160 } as const;

const TONE_FILL: Record<BarTone, string> = {
  neutral: COLOR.surfaceAlt,
  accent: shade(COLOR.accent, "low"),
  success: shade(COLOR.success, "high"),
};

/** A fixed line box, so a bar with a blank caption still stands on the same baseline. */
const CAPTION: CSSProperties = {
  ...TEXT.monoMicro,
  lineHeight: "12px",
  minHeight: 12,
  whiteSpace: "nowrap",
};

const BAR_COLUMN: CSSProperties = {
  ...GROW,
  ...COLUMN,
  height: "100%",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: SPACE.xs,
};

/** Vertical bars that share the width evenly; an empty bar keeps a sliver so it stays visible. */
export function BarChart({
  bars,
  size = "md",
  tone = "neutral",
  ariaLabel,
}: BarChartProps): JSX.Element {
  return (
    <div
      role="list"
      aria-label={ariaLabel}
      style={{ ...ROW, alignItems: "flex-end", height: HEIGHT[size], gap: SPACE.xs }}
    >
      {bars.map((bar, index) => (
        <div
          key={index}
          role="listitem"
          aria-current={bar.highlight ? true : undefined}
          data-height-pct={bar.heightPct}
          style={BAR_COLUMN}
        >
          {bar.value !== undefined && <span style={CAPTION}>{bar.value}</span>}
          <div
            style={{
              width: "100%",
              height: `${bar.heightPct}%`,
              minHeight: 3,
              borderRadius: `${RADIUS.bar}px ${RADIUS.bar}px 0 0`,
              background: bar.highlight ? COLOR.accent : TONE_FILL[tone],
              transition: "height 0.3s",
            }}
          />
          <span style={CAPTION}>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}
