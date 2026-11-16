import type { CSSProperties, ReactNode } from "react";
import { TEXT, toneColor } from "./tokens";
import type { Tone } from "./tokens";

interface EyebrowProps {
  children?: ReactNode;
  /** `accent` for the label above a headline; `neutral` (default) for section labels. */
  tone?: Tone;
  /** Layout only (margins, padding). */
  style?: CSSProperties;
}

/** A mono micro-label. Upper-cases its text, so write it in plain case. */
export function Eyebrow({ children, tone = "neutral", style }: EyebrowProps): JSX.Element {
  const color = toneColor(tone) ?? TEXT.eyebrow.color;
  return <div style={{ ...TEXT.eyebrow, color, ...style }}>{children}</div>;
}
