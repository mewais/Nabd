import { Eyebrow, RADIUS, SURFACE2_BOX, TEXT } from "@nabd/design-system";
import type { ChartStatVM } from "./chart-vm";

const TONE_COLOR: Record<ChartStatVM["tone"], string> = {
  neutral: "var(--text)",
  accent: "var(--accent)",
  success: "var(--accent2)",
};

/** One headline figure of the trend. */
export function StatTile({ stat }: { stat: ChartStatVM }): JSX.Element {
  return (
    <div style={{ ...SURFACE2_BOX, flex: 1, borderRadius: RADIUS.tile, padding: "13px 15px" }}>
      <Eyebrow>{stat.label}</Eyebrow>
      <div style={{ ...TEXT.monoValue, fontSize: 21, marginTop: 5, color: TONE_COLOR[stat.tone] }}>
        {stat.value}
      </div>
    </div>
  );
}
