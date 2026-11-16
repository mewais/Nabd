import type { ReactNode } from "react";

export interface EmptyNoteProps {
  children?: ReactNode;
}

/** The quiet sentence a card or list shows while it has nothing to show yet. */
export function EmptyNote({ children }: EmptyNoteProps): JSX.Element {
  return (
    <p
      style={{ margin: 0, padding: "14px 0", fontSize: 13, lineHeight: 1.5, color: "var(--text3)" }}
    >
      {children}
    </p>
  );
}
