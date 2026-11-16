import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "./icon-button";
import {
  COLOR,
  ELLIPSIS,
  FONT_SIZE,
  QUIET_BOX,
  RADIUS,
  SPACE,
  TEXT,
  tint,
  toneColor,
} from "./tokens";
import type { Tone } from "./tokens";

type ChipVariant = "pill" | "tag" | "box";

interface ChipProps {
  children?: ReactNode;
  /**
   * - `pill` (default): a rounded label.
   * - `tag`: a small mono marker such as "CUSTOM".
   * - `box`: a list entry that fills its row and cuts long text short.
   */
  variant?: ChipVariant;
  tone?: Tone;
  /** With this the chip ends in a × that calls it. */
  onRemove?: () => void;
  /** Accessible name of the ×. */
  removeLabel?: string;
}

/** `color` is null for a neutral chip, which takes its variant's own quiet colours. */
function variantStyle(variant: ChipVariant, color: string | null): CSSProperties {
  switch (variant) {
    case "tag":
      return {
        ...TEXT.monoCaption,
        fontSize: FONT_SIZE.micro,
        letterSpacing: ".04em",
        color: color ?? COLOR.textFaint,
        border: `1px solid ${color ?? COLOR.line}`,
        borderRadius: RADIUS.tag,
        padding: `${SPACE.xxs}px ${SPACE.sm}px`,
        flex: "none",
        whiteSpace: "nowrap",
      };
    case "box":
      return {
        display: "flex",
        alignItems: "center",
        gap: SPACE.xs,
        minWidth: 0,
        fontSize: FONT_SIZE.small,
        color: color ?? COLOR.textMuted,
        background: color ? tint(color, "soft") : COLOR.surfaceAlt,
        border: `1px solid ${color ? tint(color, "edge") : COLOR.line}`,
        borderRadius: RADIUS.chip,
        padding: `${SPACE.xs}px ${SPACE.sm}px`,
      };
    case "pill":
      return {
        ...QUIET_BOX,
        fontSize: FONT_SIZE.small,
        color: color ?? COLOR.textMuted,
        borderRadius: RADIUS.pill,
        padding: `${SPACE.xs}px ${SPACE.md}px`,
      };
  }
}

/** A static label. For a clickable one use `ChipToggle`. */
export function Chip({
  children,
  variant = "pill",
  tone = "neutral",
  onRemove,
  removeLabel = "Remove",
}: ChipProps): JSX.Element {
  return (
    <span style={variantStyle(variant, toneColor(tone))}>
      {variant === "box" ? <span style={ELLIPSIS}>{children}</span> : children}
      {onRemove && (
        <IconButton icon="close" ariaLabel={removeLabel} variant="plain" onClick={onRemove} />
      )}
    </span>
  );
}
