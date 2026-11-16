import type { CSSProperties, ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { COLOR, FONT_SIZE, QUIET_BOX, RADIUS, SPACE, toneColor } from "./tokens";
import type { Tone } from "./tokens";

/**
 * - `primary`: filled, for the one main action.
 * - `secondary`: a quiet filled box.
 * - `ghost`: outline only.
 * - `link`: bare coloured text, for inline actions.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Colour. Defaults to `accent` for primary and link buttons, `neutral` otherwise. */
  tone?: Tone;
  /** A dashed outline, for "add another" ghost buttons. */
  dashed?: boolean;
  /** Fill the available width. */
  block?: boolean;
  /** Take the free space of the Row it sits in. */
  grow?: boolean;
  disabled?: boolean;
  /** For a button that switches a mode on and off: whether it is on. */
  pressed?: boolean;
  /** Tooltip. */
  title?: string;
  /** Accessible name, when the visible text is not enough. */
  ariaLabel?: string;
}

const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: {
    borderRadius: RADIUS.chip,
    padding: `${SPACE.sm}px ${SPACE.md}px`,
    fontSize: FONT_SIZE.small,
  },
  md: {
    borderRadius: RADIUS.control,
    padding: `${SPACE.md}px ${SPACE.lg}px`,
    fontSize: FONT_SIZE.base,
  },
  lg: {
    borderRadius: RADIUS.control,
    padding: `${SPACE.lg}px ${SPACE.xl}px`,
    fontSize: FONT_SIZE.medium,
  },
};

function variantStyle(variant: ButtonVariant, tone: Tone, dashed: boolean): CSSProperties {
  const color = toneColor(tone) ?? COLOR.textMuted;
  switch (variant) {
    case "primary":
      return {
        background: color,
        color: COLOR.onAccent,
        border: "1px solid transparent",
        fontWeight: 700,
      };
    case "secondary":
      return { ...QUIET_BOX, color: COLOR.text, fontWeight: 600 };
    case "ghost":
      return {
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${tone === "neutral" ? COLOR.line : color}`,
        fontWeight: 600,
      };
    case "link":
      return { color, padding: 0, fontWeight: 600 };
  }
}

/** A button with words on it. */
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  tone = variant === "primary" || variant === "link" ? "accent" : "neutral",
  dashed = false,
  block = false,
  grow = false,
  disabled = false,
  pressed,
  title,
  ariaLabel,
}: ButtonProps): JSX.Element {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: SPACE.sm,
        flex: grow ? 1 : "none",
        width: block ? "100%" : undefined,
        textAlign: "center",
        lineHeight: 1.2,
        ...SIZES[size],
        ...variantStyle(variant, tone, dashed),
      }}
    >
      {children}
    </ButtonBase>
  );
}
