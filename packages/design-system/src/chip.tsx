import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "./icon-button";
import { CENTERED_ROW, pad } from "./styles";
import { COLOR, ELLIPSIS, QUIET_BOX, RADIUS, SPACE, TEXT, tint, toneColor } from "./tokens";
import type { Tone } from "./tokens";
import { WORDS } from "./wording";

/**
 * - `pill` (default): a rounded label.
 * - `tag`: a small mono marker such as "CUSTOM".
 * - `entry`: a list entry that fills its row and cuts long text short.
 */
type ChipVariant = "pill" | "tag" | "entry";

interface ChipProps {
  children?: ReactNode;
  variant?: ChipVariant;
  tone?: Tone;
  /** With this the chip ends in a × that calls it. */
  onRemove?: () => void;
  /** Accessible name of the ×. */
  removeAriaLabel?: string;
}

/** `color` is null for a neutral chip, which takes its variant's own quiet colours. */
function variantStyle(variant: ChipVariant, color: string | null): CSSProperties {
  switch (variant) {
    case "tag":
      return {
        ...TEXT.monoMicro,
        letterSpacing: ".04em",
        color: color ?? COLOR.textFaint,
        border: `1px solid ${color ?? COLOR.line}`,
        borderRadius: RADIUS.tag,
        padding: pad("xxs", "sm"),
        flex: "none",
        whiteSpace: "nowrap",
      };
    case "entry":
      return {
        ...TEXT.controlSm,
        ...CENTERED_ROW,
        gap: SPACE.xs,
        minWidth: 0,
        color: color ?? COLOR.textMuted,
        background: color ? tint(color, "soft") : COLOR.surfaceAlt,
        border: `1px solid ${color ? tint(color, "edge") : COLOR.line}`,
        borderRadius: RADIUS.chip,
        padding: pad("xs", "sm"),
      };
    case "pill":
      return {
        ...QUIET_BOX,
        ...TEXT.controlSm,
        color: color ?? COLOR.textMuted,
        borderRadius: RADIUS.pill,
        padding: pad("xs", "md"),
      };
  }
}

/** A static label. For one that can be switched on and off, use `ChipGroup`. */
export function Chip({
  children,
  variant = "pill",
  tone = "neutral",
  onRemove,
  removeAriaLabel = WORDS.remove,
}: ChipProps): JSX.Element {
  return (
    <span style={variantStyle(variant, toneColor(tone))}>
      {variant === "entry" ? <span style={ELLIPSIS}>{children}</span> : children}
      {onRemove && (
        <IconButton icon="close" ariaLabel={removeAriaLabel} variant="plain" onClick={onRemove} />
      )}
    </span>
  );
}
