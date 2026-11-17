import type { CSSProperties } from "react";
import { ALIGN, boxStyle } from "./layout";
import type { Align, BoxProps } from "./layout";
import { SPACE, WIDTH } from "./tokens";
import type { Space, Width } from "./tokens";

/**
 * One column of a grid:
 * - a number: that many shares of the room the fixed columns leave;
 * - a named width: exactly that wide;
 * - `fit`: as wide as its content;
 * - `{ min }`: a share of the room, never narrower than the named width.
 */
type Track = number | Width | "fit" | { min: Width };

/**
 * The columns of a grid: a number of equal ones, a list of {@link Track}s, or
 * `{ atLeast }` — as many columns, each at least that named width, as fit.
 */
export type GridColumns = number | readonly Track[] | { atLeast: Width };

/** The rows of a grid: one row as tall as the grid (`fill`), or rows at least that named height. */
type GridRows = "fill" | { min: Width };

interface GridProps extends BoxProps {
  columns: GridColumns;
  /** Rows fit their content unless this says otherwise. */
  rows?: GridRows;
  gap?: Space;
  /** How cells sit in their row; they fill it by default. */
  align?: Exclude<Align, "baseline">;
}

function track(column: Track): string {
  if (typeof column === "number") return `minmax(0, ${column}fr)`;
  if (column === "fit") return "auto";
  if (typeof column === "object") return `minmax(${WIDTH[column.min]}px, 1fr)`;
  return `${WIDTH[column]}px`;
}

function template(columns: GridColumns): string {
  if (typeof columns === "number") return `repeat(${columns}, minmax(0, 1fr))`;
  if ("atLeast" in columns) return `repeat(auto-fill, minmax(${WIDTH[columns.atLeast]}px, 1fr))`;
  return columns.map(track).join(" ");
}

const rowSize = (rows: GridRows): string =>
  rows === "fill" ? "minmax(0, 1fr)" : `minmax(${WIDTH[rows.min]}px, auto)`;

/** Children in columns: a table's rows, a board of tiles, two panes side by side. */
export function Grid(props: GridProps): JSX.Element {
  const { as: Tag = "div", columns, rows, gap = "none", align } = props;
  const style: CSSProperties = {
    ...boxStyle(props),
    display: "grid",
    gridTemplateColumns: template(columns),
    gridAutoRows: rows && rowSize(rows),
    gap: SPACE[gap],
    alignItems: align && ALIGN[align],
  };
  return (
    <Tag role={props.role} aria-label={props.ariaLabel} style={style}>
      {props.children}
    </Tag>
  );
}
