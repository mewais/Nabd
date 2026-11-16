import type { CSSProperties, ReactNode } from "react";

export interface RowButtonProps {
  children?: ReactNode;
  onClick: () => void;
  /** Accessible name, when the row's content is not enough. */
  ariaLabel?: string;
  /** Layout of the row and of its content (grid, padding, dividers). */
  style?: CSSProperties;
}

/** A whole list or table row that is one button: it looks like its content, not like a button. */
export function RowButton({ children, onClick, ariaLabel, style }: RowButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: "100%",
        background: "none",
        border: "none",
        padding: 0,
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
