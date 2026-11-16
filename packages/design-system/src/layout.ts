// What the layout primitives (Row, Stack, Grid, ScrollArea) have in common:
// spacing from the scale, a hairline on one side, and the element they render.

import type { AriaRole, CSSProperties, ReactNode } from "react";
import { GROW } from "./styles";
import { COLOR, DIMMED_OPACITY, HAIRLINE, SPACE } from "./tokens";
import type { Space } from "./tokens";

/** The elements a layout primitive can be, so structure stays semantic. */
type LayoutTag =
  | "div"
  | "span"
  | "section"
  | "nav"
  | "header"
  | "footer"
  | "aside"
  | "main"
  | "ul"
  | "li";

type Side = "top" | "right" | "bottom" | "left";

/** The props every layout primitive takes besides its own. */
export interface BoxProps {
  /** The element to render; a `div` unless the content has a meaning of its own. */
  as?: LayoutTag;
  /** Padding on every side, a step of the spacing scale. */
  padding?: Space;
  /** Left and right padding; wins over `padding`. */
  paddingX?: Space;
  /** Top and bottom padding; wins over `padding`. */
  paddingY?: Space;
  /** Top padding alone, for a block that sits above something padded of its own; wins over `paddingY`. */
  paddingTop?: Space;
  /** Take the free space of the Row or Stack around it, and shrink below the content's width. */
  grow?: boolean;
  /** A hairline on that side: the box is divided from what comes before or after. */
  edge?: Side;
  /** Paint the raised-panel colour behind the content (the app chrome). */
  surface?: boolean;
  /** Out of play for now: drawn faded. Say why in words as well. */
  dimmed?: boolean;
  role?: AriaRole;
  ariaLabel?: string;
  children?: ReactNode;
}

const EDGE_PROPERTY = {
  top: "borderTop",
  right: "borderRight",
  bottom: "borderBottom",
  left: "borderLeft",
} as const satisfies Record<Side, keyof CSSProperties>;

const LIST_RESET: CSSProperties = { margin: 0, listStyle: "none" };

/** The style of the box itself; a primitive adds how it lays its children out. */
export function boxStyle(props: BoxProps): CSSProperties {
  const { padding = "none", paddingX = padding, paddingY = padding, paddingTop = paddingY } = props;
  return {
    ...(props.as === "ul" || props.as === "li" ? LIST_RESET : undefined),
    padding: `${SPACE[paddingTop]}px ${SPACE[paddingX]}px ${SPACE[paddingY]}px`,
    ...(props.grow ? { ...GROW, minHeight: 0 } : undefined),
    ...(props.edge ? { [EDGE_PROPERTY[props.edge]]: HAIRLINE } : undefined),
    ...(props.surface ? { background: COLOR.surface } : undefined),
    ...(props.dimmed ? { opacity: DIMMED_OPACITY } : undefined),
  };
}

export type Align = "start" | "center" | "end" | "baseline" | "stretch";
export type Justify = "start" | "center" | "end" | "between";

export const ALIGN: Record<Align, CSSProperties["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
};

export const JUSTIFY: Record<Justify, CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};
