import type { CSSProperties, ReactNode } from "react";
import { ButtonBase } from "./button-base";
import { COLUMN } from "./styles";
import { COLOR, RADIUS, RAISED_BOX, SPACE, tint } from "./tokens";

interface CardButtonProps {
  /** Phrasing content: lay it out with `as="span"` primitives. */
  children?: ReactNode;
  onClick: () => void;
  /** The one currently picked: drawn with an accent ring. */
  selected?: boolean;
  /** Accessible name, when the content is not enough. */
  ariaLabel?: string;
}

const SELECTED: CSSProperties = {
  background: COLOR.surface,
  color: COLOR.text,
  border: `1px solid ${COLOR.accent}`,
  boxShadow: `0 0 0 3px ${tint(COLOR.accent, "soft")}`,
};

/** A tile that is one big button, picked from a row of its kind. */
export function CardButton({
  children,
  onClick,
  selected = false,
  ariaLabel,
}: CardButtonProps): JSX.Element {
  return (
    <ButtonBase
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        ...COLUMN,
        minWidth: 0,
        padding: SPACE.md,
        borderRadius: RADIUS.tile,
        textAlign: "left",
        ...(selected ? SELECTED : { ...RAISED_BOX, color: COLOR.text }),
      }}
    >
      {children}
    </ButtonBase>
  );
}
