import type { CSSProperties } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-paths";
import { RADIUS, SURFACE2_BOX, toneColor } from "./tokens";
import type { Tone } from "./tokens";

/**
 * - `boxed`: a square filled button (close, duplicate, delete, settings).
 * - `mini`: the small square used in dense rows (reorder arrows).
 * - `plain`: the bare glyph (remove ×).
 */
type IconButtonVariant = "boxed" | "mini" | "plain";

interface IconButtonProps {
  icon: IconName;
  /** Accessible name; also the tooltip. */
  ariaLabel: string;
  onClick: () => void;
  variant?: IconButtonVariant;
  /** Colours the icon; `neutral` leaves it in the button's own text colour. */
  tone?: Tone;
  disabled?: boolean;
}

const VARIANTS: Record<IconButtonVariant, { box: CSSProperties; iconSize: number }> = {
  boxed: {
    box: {
      ...SURFACE2_BOX,
      width: 34,
      height: 34,
      borderRadius: RADIUS.field,
      color: "var(--text2)",
    },
    iconSize: 15,
  },
  mini: {
    box: {
      ...SURFACE2_BOX,
      width: 22,
      height: 22,
      borderRadius: RADIUS.tag,
      color: "var(--text2)",
    },
    iconSize: 11,
  },
  plain: {
    box: { background: "none", border: "none", color: "var(--text3)" },
    iconSize: 14,
  },
};

/** A button that is only an icon. */
export function IconButton({
  icon,
  ariaLabel,
  onClick,
  variant = "boxed",
  tone = "neutral",
  disabled = false,
}: IconButtonProps): JSX.Element {
  const { box, iconSize } = VARIANTS[variant];
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        flex: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...box,
      }}
    >
      <Icon
        name={icon}
        size={iconSize}
        strokeWidth={2.2}
        stroke={toneColor(tone) ?? "currentColor"}
      />
    </button>
  );
}
