import type { ReactNode } from "react";
import { SPACE, WIDTH } from "./tokens";
import type { Space, Width } from "./tokens";

interface ColumnsProps {
  /** The narrowest a column may be; as many columns as fit are made. */
  minWidth: Width;
  gap?: Space;
  children?: ReactNode;
}

/** A long list flowing down one column and on into the next, like newspaper text. */
export function Columns({ minWidth, gap = "none", children }: ColumnsProps): JSX.Element {
  return <div style={{ columnWidth: WIDTH[minWidth], columnGap: SPACE[gap] }}>{children}</div>;
}
