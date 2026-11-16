import { FONT } from "./tokens";

export interface BarDatum {
  /** The caption under the bar. */
  label: string;
  /** Bar height as a share of the chart, 0–100. */
  heightPct: number;
  /** The figure printed above the bar, if any. */
  value?: string;
  /** Draw this bar in the full accent (the current day, the peak hour…). */
  highlight?: boolean;
}

/** What the bars that are not highlighted look like. */
export type BarTone = "neutral" | "accent" | "success";

export interface BarChartProps {
  bars: readonly BarDatum[];
  /** Chart height in px, captions included. */
  height: number;
  tone?: BarTone;
  /** Names the chart for assistive tech. */
  ariaLabel: string;
}

const TONE_FILL: Record<BarTone, string> = {
  neutral: "var(--surface2)",
  accent: "color-mix(in oklch, var(--accent) 30%, var(--surface2))",
  success: "color-mix(in oklch, var(--accent2) 70%, var(--surface2))",
};

const CAPTION = { fontFamily: FONT.mono, fontSize: 10, color: "var(--text3)" } as const;

/** Vertical bars that share the width evenly; an empty bar keeps a sliver so it stays visible. */
export function BarChart({
  bars,
  height,
  tone = "neutral",
  ariaLabel,
}: BarChartProps): JSX.Element {
  return (
    <div
      role="list"
      aria-label={ariaLabel}
      style={{ display: "flex", alignItems: "flex-end", height, gap: 6 }}
    >
      {bars.map((bar, index) => (
        <div
          key={index}
          role="listitem"
          aria-current={bar.highlight ? true : undefined}
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
          }}
        >
          {bar.value !== undefined && <span style={CAPTION}>{bar.value}</span>}
          <div
            style={{
              width: "100%",
              height: `${bar.heightPct}%`,
              minHeight: 3,
              borderRadius: "3px 3px 0 0",
              background: bar.highlight ? "var(--accent)" : TONE_FILL[tone],
              transition: "height 0.3s",
            }}
          />
          <span style={CAPTION}>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}
