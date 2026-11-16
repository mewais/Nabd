import type { CSSProperties } from "react";
import { ButtonBase } from "./button-base";
import { Icon } from "./icon";
import type { IconName } from "./icon-paths";
import { COLOR, QUIET_BOX, RADIUS, RAISED_BOX } from "./tokens";
import type { Tone } from "./tokens";

/**
 * - `boxed`: a square filled button (close, duplicate, delete, settings).
 * - `raised`: the same on a quiet fill, where `boxed` would not show (a stepper's − and +).
 * - `mini`: the small square used in dense rows (reorder arrows, table steppers).
 * - `plain`: the bare glyph (remove ×).
 */
type IconButtonVariant = "boxed" | "raised" | "mini" | "plain";

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

const LARGE = 32;
const MINI = 24;

function square(side: number, radius: number): CSSProperties {
  return { width: side, height: side, borderRadius: radius };
}

const VARIANTS: Record<IconButtonVariant, { box: CSSProperties; iconSize: number }> = {
  boxed: {
    box: { ...QUIET_BOX, ...square(LARGE, RADIUS.control), color: COLOR.textMuted },
    iconSize: 15,
  },
  raised: {
    box: { ...RAISED_BOX, ...square(LARGE, RADIUS.chip), color: COLOR.text },
    iconSize: 15,
  },
  mini: {
    box: { ...QUIET_BOX, ...square(MINI, RADIUS.tag), color: COLOR.textMuted },
    iconSize: 11,
  },
  plain: { box: { ...square(MINI, RADIUS.tag), color: COLOR.textFaint }, iconSize: 14 },
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
    <ButtonBase
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        ...box,
      }}
    >
      <Icon name={icon} size={iconSize} strokeWidth={2.2} tone={tone} />
    </ButtonBase>
  );
}
