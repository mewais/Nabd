import type { ReactNode } from "react";
import { Row } from "./row";
import { WIDTH } from "./tokens";
import type { Space, Width } from "./tokens";

interface WithSideProps {
  /** The main pane: it takes whatever room the side pane leaves. */
  children: ReactNode;
  /** The side pane, beside the main one on its right. */
  side: ReactNode;
  /** The side pane's width beside the main one. */
  sideWidth: Width;
  /**
   * The narrowest the main pane may get beside the side pane. With
   * less room than that and the side pane together, the side pane goes under
   * the main one instead, both as wide as the container.
   */
  mainMinWidth: Width;
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
    <Row wrap align="start" gap={gap}>
      {/* Growing ever so much faster, the main pane takes all the room the side pane can spare. */}
      <div style={{ flex: "999 1 0", minWidth: `min(${WIDTH[mainMinWidth]}px, 100%)` }}>
        {children}
      </div>
      <div style={{ flex: `1 1 ${WIDTH[sideWidth]}px`, minWidth: 0 }}>{side}</div>
    </Row>
  );
}
