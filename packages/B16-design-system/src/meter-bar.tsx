import type { ReactNode } from "react";
import { FONT, RADIUS } from "./tokens";

export interface MeterBarProps {
  label: string;
  /** How full the bar is, 0–100 (clamped). */
  pct: number;
  /** The figure after the bar, e.g. "47%" or "6 sets". */
  value: string;
  /** Width reserved for the figure, in px, so a column of meters lines up. */
  valueWidth?: number;
  /** Something after the figure, such as a status tag. */
  trailing?: ReactNode;
}

/** A labelled horizontal meter: name, bar, figure. */
export function MeterBar({
  label,
  pct,
  value,
  valueWidth = 32,
  trailing,
}: MeterBarProps): JSX.Element {
  const filled = Math.round(Math.min(100, Math.max(0, pct)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <span style={{ width: 74, flex: "none", fontSize: 12.5 }}>{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={filled}
        aria-valuetext={value}
        style={{
          flex: 1,
          height: 6,
          borderRadius: RADIUS.bar,
          background: "var(--surface2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${filled}%`,
            height: "100%",
            borderRadius: RADIUS.bar,
            background: "var(--accent)",
            transition: "width .5s",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 11,
          color: "var(--text2)",
          width: valueWidth,
          textAlign: "right",
          flex: "none",
        }}
      >
        {value}
      </span>
      {trailing}
    </div>
  );
}
