import type { CSSProperties } from "react";
import { clamp } from "@nabd/domain";
import { Row } from "./row";
import { COLOR, RADIUS, TEXT, toneColor } from "./tokens";
import type { Size, Tone } from "./tokens";

interface MeterBarProps {
  label: string;
  /** How full the bar is, 0–100 (clamped). */
  pct: number;
  /** The figure after the bar, e.g. "47%" or "6 sets". */
  value: string;
  /** `md` keeps room for a figure with its unit ("1.5 sets"), so a column of meters lines up. */
  valueWidth?: Extract<Size, "sm" | "md">;
  /** A word after the figure when the meter stands out ("Push"); room is kept for it when given, even empty. */
  tag?: string;
  tagTone?: Tone;
}

const LABEL_WIDTH = 76;
const VALUE_WIDTH = { sm: 32, md: 64 } as const;
const TAG_WIDTH = 40;
const HEIGHT = 6;

const FIGURE: CSSProperties = {
  ...TEXT.monoCaption,
  color: COLOR.textMuted,
  textAlign: "right",
  flex: "none",
};
const TAG: CSSProperties = { ...TEXT.eyebrow, width: TAG_WIDTH, textAlign: "right", flex: "none" };

/** A labelled horizontal meter: name, bar, figure. */
export function MeterBar({
  label,
  pct,
  value,
  valueWidth = "sm",
  tag,
  tagTone = "neutral",
}: MeterBarProps): JSX.Element {
  const filled = Math.round(clamp(pct, 0, 100));
  return (
    <Row role="group" ariaLabel={label} gap="sm" paddingY="xs">
      <span style={{ ...TEXT.hint, color: COLOR.text, width: LABEL_WIDTH, flex: "none" }}>
        {label}
      </span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={filled}
        aria-valuetext={value}
        style={{
          flex: 1,
          height: HEIGHT,
          borderRadius: RADIUS.bar,
          background: COLOR.surfaceAlt,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${filled}%`,
            height: "100%",
            borderRadius: RADIUS.bar,
            background: COLOR.accent,
            transition: "width .5s",
          }}
        />
      </div>
      <span style={{ ...FIGURE, width: VALUE_WIDTH[valueWidth] }}>{value}</span>
      {tag !== undefined && (
        <span style={{ ...TAG, color: toneColor(tagTone) ?? TEXT.eyebrow.color }}>{tag}</span>
      )}
    </Row>
  );
}
