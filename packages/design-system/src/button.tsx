import type { CSSProperties, ReactNode } from "react";
import { badgeStyle } from "./badge";
import { ButtonBase } from "./button-base";
import { CENTERED, dashed, pad } from "./styles";
import { COLOR, FONT_WEIGHT, QUIET_BOX, RADIUS, SPACE, TEXT, toneColor } from "./tokens";
import type { Size, Tone } from "./tokens";

/**
 * - `primary`: filled, for the one main action.
 * - `secondary`: a quiet filled box.
 * - `ghost`: outline only.
 * - `link`: bare coloured text, for inline actions.
 * - `add`: a dashed outline, for "add another".
 * - `badge`: a small square mono marker that can be pressed (see `Badge`).
 */
type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "add" | "badge";
type ButtonSize = Extract<Size, "sm" | "md" | "lg">;

interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Colour. Defaults to `accent` for primary and link buttons, `neutral` otherwise. */
  tone?: Tone;
  /** Fill the available width. */
  block?: boolean;
  /** Take the free space of the Row it sits in. */
  grow?: boolean;
  disabled?: boolean;
  /** For a button that switches a mode on and off: whether it is on. */
  on?: boolean;
  /** Tooltip. */
  title?: string;
  /** Accessible name, when the visible text is not enough. */
  ariaLabel?: string;
}

const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { ...TEXT.controlSm, borderRadius: RADIUS.chip, padding: pad("sm", "md") },
  md: { ...TEXT.controlMd, borderRadius: RADIUS.control, padding: pad("md", "lg") },
  lg: { ...TEXT.controlLg, borderRadius: RADIUS.control, padding: pad("lg", "xl") },
};

function variantStyle(variant: ButtonVariant, tone: Tone): CSSProperties {
  const color = toneColor(tone) ?? COLOR.textMuted;
  const outline = tone === "neutral" ? COLOR.line : color;
  switch (variant) {
    case "primary":
      return {
        background: color,
        color: COLOR.onAccent,
        border: `1px solid ${COLOR.none}`,
        fontWeight: FONT_WEIGHT.bold,
      };
    case "secondary":
      return { ...QUIET_BOX, color: COLOR.text, fontWeight: FONT_WEIGHT.semibold };
    case "ghost":
      return { color, border: `1px solid ${outline}`, fontWeight: FONT_WEIGHT.semibold };
    case "add":
      return {
        color,
        border: dashed(outline),
        fontWeight: FONT_WEIGHT.semibold,
      };
    case "link":
      return { color, padding: 0, fontWeight: FONT_WEIGHT.semibold };
    case "badge":
      return badgeStyle(tone);
  }
}

/** A button with words on it. */
export function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  tone = variant === "primary" || variant === "link" ? "accent" : "neutral",
  block = false,
  grow = false,
  disabled = false,
  on,
  title,
  ariaLabel,
}: ButtonProps): JSX.Element {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={on}
      style={{
        ...CENTERED,
        gap: SPACE.sm,
        flex: grow ? 1 : "none",
        width: block ? "100%" : undefined,
        textAlign: "center",
        lineHeight: 1.2,
        ...(variant === "badge" ? undefined : SIZES[size]),
        ...variantStyle(variant, tone),
      }}
    >
      {children}
    </ButtonBase>
  );
}
