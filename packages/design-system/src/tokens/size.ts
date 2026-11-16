// Sizes: the one scale components come in, the icon sizes, and the named
// widths of columns and panes.

/**
 * The steps a component comes in, smallest first. Each component takes the
 * subset it has (`Extract<Size, "sm" | "md">`) and names its default.
 */
export type Size = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

/** The side of an icon at each size, in px. */
export const ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const satisfies Record<Size, number>;

/** A size an icon comes in. */
export type IconSize = keyof typeof ICON_SIZE;

/**
 * Fixed widths, in px, named after what they hold — the columns of a grid,
 * the panes of a layout. Screens name them (`columns={["badge", 1, "badge"]}`);
 * only the design system turns them into pixels.
 */
export const WIDTH = {
  /** A column holding a small icon, such as a row's chevron. */
  icon: 16,
  /** A column holding a badge or a small icon button. */
  badge: 24,
  /** A column holding a small stepper. */
  stepper: 96,
  /** A column holding a figure of a table. */
  figure: 132,
  /** The narrowest a tile, or a table's main column, gets. */
  tile: 150,
  /** The app's sidebar, and the list beside a dialog's form. */
  sidebar: 250,
  /** The narrowest a column of meters stays readable. */
  meters: 260,
  /** A rail beside an editor. */
  rail: 300,
  /** The narrowest an editor gets beside its rail. */
  editor: 480,
} as const;

/** A named width. */
export type Width = keyof typeof WIDTH;
