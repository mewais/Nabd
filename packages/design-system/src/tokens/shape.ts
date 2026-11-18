import type { CSSProperties } from "react";
import { COLOR } from "./color";

/** Corner radii, named after what they round. */
export const RADIUS = {
  bar: 4,
  tag: 6,
  chip: 8,
  control: 10,
  tile: 12,
  card: 16,
  modal: 20,
  pill: 999,
  round: "50%",
} as const;

/** The one border: a hairline in the line colour. */
export const HAIRLINE = `1px solid ${COLOR.line}`;

/** Shadows: a card's own (which follows the theme), and those of the things that float above the page. */
export const SHADOW = {
  card: "var(--cardshadow)",
  popover: "0 8px 32px rgba(0,0,0,.22)",
  toast: "0 18px 50px rgba(0,0,0,.22)",
  modal: "0 24px 70px rgba(0,0,0,.3)",
} as const;

/** Stacking layers, lowest first. A modal opened from another modal goes one layer up. */
export const Z = {
  toast: 60,
  modal: 70,
  modalOver: 80,
  modalTop: 90,
  confirm: 100,
  popover: 200,
} as const;

/** The modal layers of `Z`; `confirm` is the confirmation asked over any of the others. */
export type ModalLayer = "modal" | "modalOver" | "modalTop" | "confirm";

/** How faded something out of play is drawn: a disabled control, a skipped row. */
export const DIMMED_OPACITY = 0.5;

/** The look shared by everything that sits on a card: a quiet filled box with a hairline. */
export const QUIET_BOX: CSSProperties = { background: COLOR.surfaceAlt, border: HAIRLINE };

const SHEET_FROST = "blur(40px)";

/**
 * The look of everything that floats over the page (a dialog, a menu, the
 * toast): the sheet colour, which stays readable over a translucent window,
 * frosting whatever it covers.
 */
export const FLOATING_BOX: CSSProperties = {
  background: COLOR.modal,
  border: HAIRLINE,
  backdropFilter: SHEET_FROST,
  WebkitBackdropFilter: SHEET_FROST,
};

/** The look of a raised panel. */
export const RAISED_BOX: CSSProperties = {
  background: COLOR.surface,
  border: HAIRLINE,
  boxShadow: SHADOW.card,
};
