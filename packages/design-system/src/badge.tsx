import type { CSSProperties, ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { COLOR, RADIUS, TEXT, tint, toneColor } from "./tokens";
import type { Tone } from "./tokens";

interface BadgeProps {
  /** One or two characters. */
  children?: ReactNode;
  tone?: Tone;
  /** With this the badge is a button. */
  onClick?: () => void;
  /** Tooltip; for a button also what clicking does. */
  title?: string;
}

const SIZE = 24;

function boxStyle(tone: Tone): CSSProperties {
  const color = toneColor(tone);
  return {
    ...TEXT.monoCaption,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none",
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS.chip,
    fontWeight: 700,
    background: color === null ? COLOR.surfaceAlt : tint(color, "soft"),
    color: color ?? COLOR.textFaint,
  };
}

/** A small square mono marker, such as a set's number in a table. */
export function Badge({ children, tone = "neutral", onClick, title }: BadgeProps): JSX.Element {
  if (!onClick) {
    return (
      <span title={title} style={boxStyle(tone)}>
        {children}
      </span>
    );
  }
  return (
    <ButtonBase onClick={onClick} title={title} style={boxStyle(tone)}>
      {children}
    </ButtonBase>
  );
}
