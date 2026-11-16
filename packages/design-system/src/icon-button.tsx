import type { CSSProperties } from "react";
import { ButtonBase } from "./button-base";
import { Icon } from "./icon";
import type { IconName } from "./icon-paths";
import { CENTERED } from "./styles";
import { COLOR, QUIET_BOX, RADIUS, RAISED_BOX } from "./tokens";
import type { IconSize, Size, Tone } from "./tokens";

/**
 * - `inset`: a square on a quiet fill (close, duplicate, delete, settings; reorder arrows).
 * - `raised`: a raised square, where `inset` would not show (a stepper's − and + on a quiet fill).
 * - `plain`: the bare glyph (remove ×).
 */
type IconButtonVariant = "inset" | "raised" | "plain";
/** `md` stands on its own; `sm` sits in a dense row. */
type IconButtonSize = Extract<Size, "sm" | "md">;

interface IconButtonProps {
  icon: IconName;
  /** Accessible name; also the tooltip. */
  ariaLabel: string;
  onClick: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Colours the icon; `neutral` leaves it in the button's own text colour. */
  tone?: Tone;
  disabled?: boolean;
}

const SIDE: Record<IconButtonSize, number> = { sm: 24, md: 32 };
const RADIUS_OF: Record<IconButtonSize, number> = { sm: RADIUS.tag, md: RADIUS.control };
const ICON: Record<IconButtonVariant, Record<IconButtonSize, IconSize>> = {
  inset: { sm: "xs", md: "md" },
  raised: { sm: "xs", md: "md" },
  plain: { sm: "sm", md: "md" },
};

function look(variant: IconButtonVariant, size: IconButtonSize): CSSProperties {
  const square = { width: SIDE[size], height: SIDE[size], borderRadius: RADIUS_OF[size] };
  switch (variant) {
    case "inset":
      return { ...QUIET_BOX, ...square, color: COLOR.textMuted };
    case "raised":
      return { ...RAISED_BOX, ...square, borderRadius: RADIUS.chip, color: COLOR.text };
    case "plain":
      return { ...square, color: COLOR.textFaint };
  }
}

/** A button that is only an icon. */
export function IconButton({
  icon,
  ariaLabel,
  onClick,
  variant = "inset",
  size = variant === "plain" ? "sm" : "md",
  tone = "neutral",
  disabled = false,
}: IconButtonProps): JSX.Element {
  return (
    <ButtonBase
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{ ...CENTERED, ...look(variant, size) }}
    >
      <Icon name={icon} size={ICON[variant][size]} weight="bold" tone={tone} />
    </ButtonBase>
  );
}
