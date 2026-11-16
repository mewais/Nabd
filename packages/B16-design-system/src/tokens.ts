// Design tokens: every font stack, radius, stacking layer and text style the
// primitives (and the screens built from them) share. Colours are not here:
// they are the theme's CSS variables (see theme.ts), used as `var(--accent)`.

import type { CSSProperties } from "react";

export const FONT = {
  sans: "'Hanken Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

/** Corner radii, named after what they round. */
export const RADIUS = {
  bar: 3,
  tag: 6,
  chip: 8,
  field: 10,
  button: 11,
  tile: 13,
  card: 16,
  modal: 18,
  pill: 999,
} as const;

/** Stacking layers, lowest first. A modal opened from another modal goes one layer up. */
export const Z = {
  raised: 1,
  sticky: 2,
  toast: 60,
  modal: 70,
  modalOver: 80,
  modalTop: 90,
  popover: 200,
} as const;

/** The three modal layers of `Z`. */
export type ModalLayer = "modal" | "modalOver" | "modalTop";

/** Fixed colours that do not follow the theme. */
export const COLOR = {
  onAccent: "#fff",
  danger: "#e05252",
  scrim: "rgba(0,0,0,.48)",
} as const;

/** A translucent wash of a colour, e.g. `tint("var(--accent)", 15)`. */
export function tint(color: string, percent: number): string {
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`;
}

/** Shared text styles. */
export const TEXT = {
  /** The mono, upper-case micro-label above titles and sections. */
  eyebrow: {
    fontFamily: FONT.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--text3)",
  },
  /** A modal's or screen's heading. */
  title: { fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" },
  cardTitle: { fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" },
  cardSubtitle: { fontSize: 11.5, color: "var(--text3)" },
  /** The name of a form row or list entry. */
  label: { fontSize: 14, fontWeight: 600 },
  /** A number shown in the mono face (stepper values, stats, counters). */
  monoValue: { fontFamily: FONT.mono, fontWeight: 600 },
} as const satisfies Record<string, CSSProperties>;

/** The look shared by everything that sits on a card: a quiet filled box with a hairline. */
export const SURFACE2_BOX: CSSProperties = {
  background: "var(--surface2)",
  border: "1px solid var(--line)",
};
