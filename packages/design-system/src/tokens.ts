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
  round: "50%",
} as const;

/** Stacking layers, lowest first. A modal opened from another modal goes one layer up. */
export const Z = {
  raised: 1,
  sticky: 2,
  toast: 60,
  modal: 70,
  modalOver: 80,
  modalTop: 90,
  confirm: 100,
  popover: 200,
} as const;

/** The modal layers of `Z`; `confirm` is the confirmation asked over any of the others. */
export type ModalLayer = "modal" | "modalOver" | "modalTop" | "confirm";

/** Fixed colours that do not follow the theme. */
export const COLOR = {
  onAccent: "#fff",
  danger: "#e05252",
  scrim: "rgba(0,0,0,.48)",
} as const;

/** Shadows of the things that float above the page. */
export const SHADOW = {
  popover: "0 8px 32px rgba(0,0,0,.22)",
  toast: "0 18px 50px rgba(0,0,0,.22)",
  modal: "0 24px 70px rgba(0,0,0,.3)",
} as const;

/**
 * What a colour says. Every `tone` prop speaks this vocabulary; `neutral` is
 * each component's own quiet default.
 */
export type Tone = "neutral" | "accent" | "success" | "info" | "danger";

const TONE_COLOR: Record<Exclude<Tone, "neutral">, string> = {
  accent: "var(--accent)",
  success: "var(--accent2)",
  info: "var(--accent3)",
  danger: COLOR.danger,
};

/** The colour of `tone`, with `neutral` standing for the given quiet colour. */
export function toneColor(tone: Tone, neutral: string): string {
  return tone === "neutral" ? neutral : TONE_COLOR[tone];
}

/** A translucent wash of a colour, e.g. `tint("var(--accent)", 15)`. */
export function tint(color: string, percent: number): string {
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`;
}

/** A colour mixed into the quiet fill, for heat scales and soft bars: `shade("var(--accent)", 30)`. */
export function shade(color: string, percent: number): string {
  return `color-mix(in oklch, ${color} ${percent}%, var(--surface2))`;
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
  /** A paragraph of running text. */
  body: { fontSize: 13, lineHeight: 1.5 },
  /** A quiet aside next to something more important. */
  hint: { fontSize: 12, color: "var(--text3)" },
  /** The mono line that says what a chart or grid shows. */
  caption: { fontFamily: FONT.mono, fontSize: 12, color: "var(--text3)" },
  /** The plan's own note on an exercise. */
  note: { fontSize: 12.5, fontStyle: "italic", color: "var(--text3)" },
  /** A number shown in the mono face (stepper values, stats, counters). */
  monoValue: { fontFamily: FONT.mono, fontWeight: 600 },
} as const satisfies Record<string, CSSProperties>;

/** One line of text, cut short with an ellipsis when it does not fit. */
export const ELLIPSIS: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/** The look shared by everything that sits on a card: a quiet filled box with a hairline. */
export const SURFACE2_BOX: CSSProperties = {
  background: "var(--surface2)",
  border: "1px solid var(--line)",
};
