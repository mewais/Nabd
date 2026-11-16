import type { CSSProperties, ReactNode } from "react";
import { COLOR, RADIUS, SURFACE2_BOX, toneColor } from "./tokens";
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
  disabled?: boolean;
  /** For a button that switches a mode on and off: whether it is on. */
  pressed?: boolean;
  /** Tooltip. */
  title?: string;
  /** Accessible name, when the visible text is not enough. */
  ariaLabel?: string;
  /** Layout only (margins, flex). */
  style?: CSSProperties;
}

const SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { borderRadius: RADIUS.chip, padding: "7px 14px", fontSize: 12.5 },
  md: { borderRadius: RADIUS.field, padding: "11px 15px", fontSize: 13 },
  lg: { borderRadius: RADIUS.button, padding: "14px 20px", fontSize: 14 },
};

function variantStyle(variant: ButtonVariant, tone: Tone, dashed: boolean): CSSProperties {
  const color = toneColor(tone) ?? "var(--text2)";
  switch (variant) {
    case "primary":
      return { background: color, color: COLOR.onAccent, border: "none", fontWeight: 700 };
    case "secondary":
      return { ...SURFACE2_BOX, color: "var(--text)", fontWeight: 600 };
    case "ghost":
      return {
        background: "transparent",
        color,
        border: `1px ${dashed ? "dashed" : "solid"} ${tone === "neutral" ? "var(--line)" : color}`,
        fontWeight: 600,
      };
    case "link":
      return { background: "none", color, border: "none", padding: 0, fontWeight: 600 };
  }
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  tone = variant === "primary" || variant === "link" ? "accent" : "neutral",
  dashed = false,
  block = false,
  disabled = false,
  pressed,
  title,
  ariaLabel,
  style,
}: ButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: block ? "100%" : undefined,
        ...SIZES[size],
        ...variantStyle(variant, tone, dashed),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
