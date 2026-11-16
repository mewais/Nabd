import type { CSSProperties, ReactNode } from "react";
import { IconButton } from "./icon-button";
import { ELLIPSIS, FONT, RADIUS, SURFACE2_BOX, tint, toneColor } from "./tokens";
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
        fontFamily: FONT.mono,
        fontSize: 9.5,
        letterSpacing: ".04em",
        color: color ?? "var(--text3)",
        border: `1px solid ${color ?? "var(--line)"}`,
        borderRadius: RADIUS.tag,
        padding: "3px 7px",
        flex: "none",
      };
    case "box":
      return {
        display: "flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
        fontSize: 12,
        color: color ?? "var(--text2)",
        background: color ? tint(color, 14) : "var(--surface2)",
        border: `1px solid ${color ? tint(color, 30) : "var(--line)"}`,
        borderRadius: RADIUS.chip,
        padding: "5px 9px",
      };
    case "pill":
      return {
        ...SURFACE2_BOX,
        fontSize: 12,
        color: color ?? "var(--text2)",
        borderRadius: RADIUS.pill,
        padding: "5px 11px",
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
