import type { ReactNode } from "react";
import { SPACE } from "./tokens";
import type { Space } from "./tokens";

interface ColumnsProps {
  /** The narrowest a column may be, in px; as many columns as fit are made. */
  minWidth: number;
  gap?: Space;
  children?: ReactNode;
}

/** A long list flowing down one column and on into the next, like newspaper text. */
export function Columns({ minWidth, gap = "none", children }: ColumnsProps): JSX.Element {
  return <div style={{ columnWidth: minWidth, columnGap: SPACE[gap] }}>{children}</div>;
}
