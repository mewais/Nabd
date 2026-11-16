import type { CSSProperties, ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { COLOR, HAIRLINE, QUIET_BOX, RADIUS, SPACE, tint } from "./tokens";

/**
 * - `plain`: a table row, divided from the one above by a hairline.
 * - `boxed`: a list entry in its own quiet box.
 * - `nav`: an entry of a list one picks from; the current one is washed in the accent.
 */
type RowButtonVariant = "plain" | "boxed" | "nav";

interface RowButtonProps {
  /** Phrasing content: lay it out with `as="span"` primitives. */
  children?: ReactNode;
  onClick: () => void;
  variant?: RowButtonVariant;
  /** Accessible name, when the row's content is not enough. */
  ariaLabel?: string;
  /** Whether this is the selected row of its list; left out for a row of a list without one. */
  current?: boolean;
  /** Out of play for now: drawn faded. */
  dimmed?: boolean;
}

const DIMMED_OPACITY = 0.5;

function variantStyle(variant: RowButtonVariant, current: boolean): CSSProperties {
  switch (variant) {
    case "plain":
      return { padding: `${SPACE.md}px ${SPACE.xxs}px`, borderTop: HAIRLINE };
    case "boxed":
      return {
        ...QUIET_BOX,
        flex: 1,
        minWidth: 0,
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        borderRadius: RADIUS.control,
        color: COLOR.text,
      };
    case "nav":
      return {
        padding: `${SPACE.sm}px ${SPACE.sm}px`,
        borderRadius: RADIUS.control,
        background: current ? tint(COLOR.accent, "soft") : COLOR.none,
        border: `1px solid ${current ? tint(COLOR.accent, "edge") : COLOR.none}`,
      };
  }
}

/** A whole list or table row that is one button: it looks like its content, not like a button. */
export function RowButton({
  children,
  onClick,
  variant = "plain",
  ariaLabel,
  current,
  dimmed = false,
}: RowButtonProps): JSX.Element {
  return (
    <ButtonBase
      aria-label={ariaLabel}
      aria-current={current}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        textAlign: "left",
        opacity: dimmed ? DIMMED_OPACITY : undefined,
        ...variantStyle(variant, current === true),
      }}
    >
      {children}
    </ButtonBase>
  );
}
