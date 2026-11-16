import type { AriaRole, CSSProperties, ReactNode } from "react";
import { COLOR, ELLIPSIS, TEXT, toneColor } from "./tokens";
import type { TextRole, Tone } from "./tokens";

/**
 * The colour of a piece of text: what it says (`Tone`), or how much it should
 * stand out — `strong`, `muted`, `faint`. `neutral` is the role's own colour.
 */
export type TextTone = Tone | "strong" | "muted" | "faint";

const EMPHASIS_COLOR = {
  strong: COLOR.text,
  muted: COLOR.textMuted,
  faint: COLOR.textFaint,
} as const;

function colorOf(tone: TextTone): string | null {
  return tone in EMPHASIS_COLOR
    ? EMPHASIS_COLOR[tone as keyof typeof EMPHASIS_COLOR]
    : toneColor(tone as Tone);
}

interface TextProps {
  /** The kind of text: a role of the type scale. */
  variant?: TextRole;
  tone?: TextTone;
  /** The element: a `div` unless the text is a heading, a paragraph, or sits inside a line or a button. */
  as?: "div" | "span" | "p" | "b" | "h1" | "h2" | "h3";
  align?: "start" | "center" | "end";
  /** Keep to one line, cut short with an ellipsis. */
  truncate?: boolean;
  /** Take the free space of the Row around it. */
  grow?: boolean;
  /** Break inside long words (paths, ids) rather than overflow. */
  breakWords?: boolean;
  /** For a heading that labels something else. */
  id?: string;
  role?: AriaRole;
  children?: ReactNode;
}

/** A piece of text in one of the app's text roles. */
export function Text({
  variant = "body",
  tone = "neutral",
  as: Tag = "div",
  align,
  truncate = false,
  grow = false,
  breakWords = false,
  id,
  role,
  children,
}: TextProps): JSX.Element {
  const color = colorOf(tone);
  const style: CSSProperties = {
    margin: 0,
    ...TEXT[variant],
    ...(color === null ? undefined : { color }),
    ...(truncate ? ELLIPSIS : undefined),
    ...(grow ? { flex: 1, minWidth: 0 } : undefined),
    textAlign: align,
    overflowWrap: breakWords ? "anywhere" : undefined,
  };
  return (
    <Tag id={id} role={role} style={style}>
      {children}
    </Tag>
  );
}
