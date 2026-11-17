// Style blocks the primitives share. Internal to the design system: screens
// name what they want through props, never through these.

import type { CSSProperties } from "react";
import { COLOR, SPACE } from "./tokens";
import type { Space } from "./tokens";

/** Its content in the middle, and its own size kept in a Row or Stack. */
export const CENTERED: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
};

/** Its children side by side, as tall as the row. */
export const ROW: CSSProperties = { display: "flex" };

/** Its children side by side, centred across the row. */
export const CENTERED_ROW: CSSProperties = { ...ROW, alignItems: "center" };

/** Its children one under the other. */
export const COLUMN: CSSProperties = { ...ROW, flexDirection: "column" };

/** Takes the free space of the Row or Stack around it, and shrinks below its content's width. */
export const GROW: CSSProperties = { flex: 1, minWidth: 0 };

/** The outline of a place where something can be added: a hairline's colour unless toned. */
export const dashed = (color: string = COLOR.line): string => `1px dashed ${color}`;

/** Padding of `y` above and below and `x` to the sides, steps of the spacing scale. */
export const pad = (y: Space, x: Space): string => `${SPACE[y]}px ${SPACE[x]}px`;
