import type { CSSProperties, ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { CENTERED_ROW, pad } from "./styles";
import {
  COLOR,
  DIMMED_OPACITY,
  FONT_WEIGHT,
  HAIRLINE,
  QUIET_BOX,
  RADIUS,
  SPACE,
  TEXT,
  tint,
} from "./tokens";

/**
 * - `plain`: a table row, divided from the one above by a hairline.
 * - `inset`: a list entry in its own quiet box.
 * - `pick`: an entry of a list one picks from; the selected one is washed in the accent.
 * - `nav`: a destination of the app's navigation; the selected one carries an accent bar.
 */
type RowButtonVariant = "plain" | "inset" | "pick" | "nav";

interface RowButtonProps {
  /** Phrasing content: lay it out with `as="span"` primitives. */
  children?: ReactNode;
  onClick: () => void;
  variant?: RowButtonVariant;
  /** Accessible name, when the row's content is not enough. */
  ariaLabel?: string;
  /** Whether this is the selected row of its list; left out for a row of a list without one. */
  selected?: boolean;
  /** Out of play for now: drawn faded. */
  dimmed?: boolean;
}

function variantStyle(variant: RowButtonVariant, selected: boolean): CSSProperties {
  switch (variant) {
    case "plain":
      return { padding: pad("md", "xxs"), borderTop: HAIRLINE };
    case "inset":
      return {
        ...QUIET_BOX,
        flex: 1,
        minWidth: 0,
        padding: pad("md", "lg"),
        borderRadius: RADIUS.control,
        color: COLOR.text,
      };
    case "pick":
      return {
        padding: SPACE.sm,
        borderRadius: RADIUS.control,
        background: selected ? tint(COLOR.accent, "soft") : COLOR.none,
        border: `1px solid ${selected ? tint(COLOR.accent, "edge") : COLOR.none}`,
      };
    case "nav":
      return {
        ...TEXT.controlLg,
        ...CENTERED_ROW,
        gap: SPACE.md,
        padding: pad("md", "lg"),
        background: selected ? COLOR.surfaceAlt : COLOR.none,
        boxShadow: `inset 3px 0 0 ${selected ? COLOR.accent : COLOR.none}`,
        fontWeight: selected ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
        color: selected ? COLOR.text : COLOR.textMuted,
        transition: "background 0.14s ease, color 0.14s ease",
      };
  }
}

/** A whole list or table row that is one button: it looks like its content, not like a button. */
export function RowButton({
  children,
  onClick,
  variant = "plain",
  ariaLabel,
  selected,
  dimmed = false,
}: RowButtonProps): JSX.Element {
  const current = variant === "nav" ? (selected ? "page" : undefined) : selected;
  return (
    <ButtonBase
      aria-label={ariaLabel}
      aria-current={current}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        opacity: dimmed ? DIMMED_OPACITY : undefined,
        ...variantStyle(variant, selected === true),
      }}
    >
      {children}
    </ButtonBase>
  );
}
