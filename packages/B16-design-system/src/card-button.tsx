import type { CSSProperties, ReactNode } from "react";
import { RADIUS, tint } from "./tokens";

export interface CardButtonProps {
  children?: ReactNode;
  onClick: () => void;
  /** The one currently picked: drawn with an accent ring. */
  selected?: boolean;
  /** A dashed, empty outline, for "add another" tiles. */
  dashed?: boolean;
  /** Accessible name, when the content is not enough. */
  ariaLabel?: string;
  /** Layout of the tile's own box and of its content. */
  style?: CSSProperties;
}

function outline(selected: boolean, dashed: boolean): CSSProperties {
  if (dashed)
    return { background: "none", border: "1px dashed var(--line)", color: "var(--text3)" };
  return {
    background: "var(--surface)",
    color: "var(--text)",
    border: selected ? "1.5px solid var(--accent)" : "1px solid var(--line)",
    boxShadow: selected ? `0 0 0 3px ${tint("var(--accent)", 18)}` : "var(--cardshadow)",
  };
}

/** A tile that is one big button: pick it from a row of its kind, or press it to add one. */
export function CardButton({
  children,
  onClick,
  selected = false,
  dashed = false,
  ariaLabel,
  style,
}: CardButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={dashed ? undefined : selected}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        ...outline(selected, dashed),
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        padding: 11,
        borderRadius: RADIUS.tile,
        fontFamily: "inherit",
        textAlign: "left",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
