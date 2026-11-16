import type { CSSProperties, ReactNode } from "react";
import { TEXT } from "./tokens";

export interface EyebrowProps {
  children?: ReactNode;
  /** `accent` for the label above a headline; `muted` (default) for section labels. */
  tone?: "muted" | "accent";
  /** Layout only (margins, padding). */
  style?: CSSProperties;
}

/** A mono micro-label. Upper-cases its text, so write it in plain case. */
export function Eyebrow({ children, tone = "muted", style }: EyebrowProps): JSX.Element {
  const color = tone === "accent" ? "var(--accent)" : TEXT.eyebrow.color;
  return <div style={{ ...TEXT.eyebrow, color, ...style }}>{children}</div>;
}
