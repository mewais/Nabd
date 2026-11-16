import type { ReactNode } from "react";
import { FONT, RADIUS, tint, toneColor } from "./tokens";
import type { Tone } from "./tokens";

export interface BadgeProps {
  /** One or two characters. */
  children?: ReactNode;
  tone?: Tone;
  /** With this the badge is a button. */
  onClick?: () => void;
  /** Tooltip; for a button also what clicking does. */
  title?: string;
}

function toneStyle(tone: Tone): { background: string; color: string } {
  if (tone === "neutral") return { background: "var(--surface2)", color: "var(--text3)" };
  const color = toneColor(tone, "");
  return { background: tint(color, 16), color };
}

/** A small square mono marker, such as a set's number in a table. */
export function Badge({ children, tone = "neutral", onClick, title }: BadgeProps): JSX.Element {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      style={{
        ...toneStyle(tone),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        width: 26,
        height: 26,
        padding: 0,
        border: "none",
        borderRadius: RADIUS.chip,
        fontFamily: FONT.mono,
        fontSize: 11,
        fontWeight: 700,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
