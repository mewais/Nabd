import type { CSSProperties, ReactNode } from "react";
import { CENTERED } from "./styles";
import { COLOR, FONT_WEIGHT, RADIUS, TEXT, tint, toneColor } from "./tokens";
import type { Tone } from "./tokens";

interface BadgeProps {
  /** One or two characters. */
  children?: ReactNode;
  tone?: Tone;
  /** Tooltip. */
  title?: string;
}

const SIZE = 24;

/** The look of a badge: a small square mono marker, tinted by its tone. Also a badge-shaped button's. */
export function badgeStyle(tone: Tone): CSSProperties {
  const color = toneColor(tone);
  return {
    ...TEXT.monoCaption,
    ...CENTERED,
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS.chip,
    fontWeight: FONT_WEIGHT.bold,
    background: color === null ? COLOR.surfaceAlt : tint(color, "soft"),
    color: color ?? COLOR.textFaint,
  };
}

/** A small square mono marker, such as a set's number in a table. For one that can be pressed, use `Button variant="badge"`. */
export function Badge({ children, tone = "neutral", title }: BadgeProps): JSX.Element {
  return (
    <span title={title} style={badgeStyle(tone)}>
      {children}
    </span>
  );
}
