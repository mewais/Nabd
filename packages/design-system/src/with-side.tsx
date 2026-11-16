import type { ReactNode } from "react";
import { SPACE } from "./tokens";
import type { Space } from "./tokens";

interface WithSideProps {
  /** The main pane: it takes whatever room the side pane leaves. */
  children: ReactNode;
  /** The side pane, beside the main one on its right. */
  side: ReactNode;
  /** The side pane's width beside the main one, in px. */
  sideWidth: number;
  /**
   * The narrowest the main pane may get beside the side pane, in px. With
   * less room than that and the side pane together, the side pane goes under
   * the main one instead, both as wide as the container.
   */
  mainMinWidth: number;
  gap?: Space;
}

/** A main pane with a side pane beside it, or under it where the two do not fit side by side. */
export function WithSide({
  children,
  side,
  sideWidth,
  mainMinWidth,
  gap = "none",
}: WithSideProps): JSX.Element {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: SPACE[gap] }}>
      {/* Growing ever so much faster, the main pane takes all the room the side pane can spare. */}
      <div style={{ flex: "999 1 0", minWidth: `min(${mainMinWidth}px, 100%)` }}>{children}</div>
      <div style={{ flex: `1 1 ${sideWidth}px`, minWidth: 0 }}>{side}</div>
    </div>
  );
}
