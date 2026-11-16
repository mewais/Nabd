import type { AriaRole, CSSProperties, ReactNode } from "react";
import { GROW } from "./styles";
import { ELLIPSIS, TEXT, toneColor } from "./tokens";
import type { TextRole, Tone } from "./tokens";

interface TextProps {
  /** The kind of text: a role of the type scale. */
  variant?: TextRole;
  /** `neutral` is the role's own colour. */
  tone?: Tone;
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
  const color = toneColor(tone);
  const style: CSSProperties = {
    margin: 0,
    ...TEXT[variant],
    ...(color === null ? undefined : { color }),
    ...(truncate ? ELLIPSIS : undefined),
    ...(grow ? GROW : undefined),
    textAlign: align,
    overflowWrap: breakWords ? "anywhere" : undefined,
  };
  return (
    <Tag id={id} role={role} style={style}>
      {children}
    </Tag>
  );
}
