import type { ReactNode } from "react";
import { FONT, RADIUS, tint } from "./tokens";

export type BadgeTone = "neutral" | "accent" | "info";

export interface BadgeProps {
  /** One or two characters. */
  children?: ReactNode;
  tone?: BadgeTone;
  /** With this the badge is a button. */
  onClick?: () => void;
  /** Tooltip; for a button also what clicking does. */
  title?: string;
}

const TONES: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: "var(--surface2)", color: "var(--text3)" },
  accent: { background: tint("var(--accent)", 16), color: "var(--accent)" },
  info: { background: tint("var(--accent3)", 16), color: "var(--accent3)" },
};

/** A small square mono marker, such as a set's number in a table. */
export function Badge({ children, tone = "neutral", onClick, title }: BadgeProps): JSX.Element {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      style={{
        ...TONES[tone],
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
