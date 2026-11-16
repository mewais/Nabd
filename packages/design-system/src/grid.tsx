import type { CSSProperties } from "react";
import { ALIGN, boxStyle } from "./layout";
import type { Align, BoxProps } from "./layout";
import { SPACE } from "./tokens";
import type { Space } from "./tokens";

interface GridProps extends BoxProps {
  /** A number of equal columns, or a `grid-template-columns` track list. */
  columns: number | string;
  /** The height of rows, as a `grid-auto-rows` track size; rows fit their content by default. */
  rows?: string;
  gap?: Space;
  /** How cells sit in their row; they fill it by default. */
  align?: Exclude<Align, "baseline">;
}

/** Children in columns: a table's rows, a board of tiles, two panes side by side. */
export function Grid(props: GridProps): JSX.Element {
  const { as: Tag = "div", columns, rows, gap = "none", align } = props;
  const style: CSSProperties = {
    ...boxStyle(props),
    display: "grid",
    gridTemplateColumns:
      typeof columns === "number" ? `repeat(${columns}, minmax(0, 1fr))` : columns,
    gridAutoRows: rows,
    gap: SPACE[gap],
    alignItems: align && ALIGN[align],
  };
  return (
    <Tag role={props.role} aria-label={props.ariaLabel} style={style}>
      {props.children}
    </Tag>
  );
}
