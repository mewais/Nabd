import type { CSSProperties, ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { COLOR, RADIUS, RAISED_BOX, SPACE, tint } from "./tokens";

interface CardButtonProps {
  /** Phrasing content: lay it out with `as="span"` primitives. */
  children?: ReactNode;
  onClick: () => void;
  /** The one currently picked: drawn with an accent ring. */
  selected?: boolean;
  /** A dashed, empty outline with its content in the middle, for "add another" tiles. */
  dashed?: boolean;
  /** Accessible name, when the content is not enough. */
  ariaLabel?: string;
}

const COLUMN: CSSProperties = { display: "flex", flexDirection: "column" };

function outline(selected: boolean, dashed: boolean): CSSProperties {
  if (dashed) {
    return {
      border: `1px dashed ${COLOR.line}`,
      color: COLOR.textFaint,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.sm,
    };
  }
  if (!selected) return { ...RAISED_BOX, color: COLOR.text };
  return {
    background: COLOR.surface,
    color: COLOR.text,
    border: `1px solid ${COLOR.accent}`,
    boxShadow: `0 0 0 3px ${tint(COLOR.accent, "soft")}`,
  };
}

/** A tile that is one big button: pick it from a row of its kind, or press it to add one. */
export function CardButton({
  children,
  onClick,
  selected = false,
  dashed = false,
  ariaLabel,
}: CardButtonProps): JSX.Element {
  return (
    <ButtonBase
      aria-pressed={dashed ? undefined : selected}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        ...COLUMN,
        minWidth: 0,
        padding: SPACE.md,
        borderRadius: RADIUS.tile,
        textAlign: "left",
        ...outline(selected, dashed),
      }}
    >
      {children}
    </ButtonBase>
  );
}
