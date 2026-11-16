import type { CSSProperties } from "react";
import { COLOR } from "./color";

export const FONT = {
  sans: "'Hanken Grotesk', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

/** The type scale, in px. Text is set through a role of `TEXT`, which picks its step. */
export const FONT_SIZE = {
  micro: 10,
  tiny: 11,
  small: 12,
  base: 13,
  medium: 14,
  large: 15,
  heading: 18,
  title: 20,
  headline: 24,
  display: 32,
  jumbo: 40,
} as const;

const MONO: CSSProperties = { fontFamily: FONT.mono };
const TIGHT = "-.02em";

/** Every kind of text the app sets, by what it is for. `Text` draws one by name. */
export const TEXT = {
  /** The one line a screen is about: the next exercise. */
  display: { fontSize: FONT_SIZE.display, fontWeight: 800, letterSpacing: TIGHT, lineHeight: 1.05 },
  /** A big statement inside a card or a form. */
  headline: {
    fontSize: FONT_SIZE.headline,
    fontWeight: 800,
    letterSpacing: TIGHT,
    lineHeight: 1.15,
  },
  /** A screen's or a modal's heading. */
  title: { fontSize: FONT_SIZE.title, fontWeight: 800, letterSpacing: TIGHT },
  /** A heading inside a panel: a day's name, the toast's exercise. */
  heading: { fontSize: FONT_SIZE.heading, fontWeight: 800, letterSpacing: TIGHT, lineHeight: 1.15 },
  /** The name of a card or of a section. */
  cardTitle: { fontSize: FONT_SIZE.large, fontWeight: 700, letterSpacing: "-.01em" },
  /** The name of a form row or of a list entry. */
  label: { fontSize: FONT_SIZE.medium, fontWeight: 600 },
  /** The name of a row in a dense list or table. */
  rowLabel: { fontSize: FONT_SIZE.base, fontWeight: 600 },
  /** A paragraph of running text. */
  body: { fontSize: FONT_SIZE.base, lineHeight: 1.5 },
  /** A quiet aside next to something more important. */
  hint: { fontSize: FONT_SIZE.small, color: COLOR.textFaint },
  /** The small print under a title. */
  caption: { fontSize: FONT_SIZE.tiny, color: COLOR.textFaint },
  /** The plan's own note on an exercise. */
  note: { fontSize: FONT_SIZE.small, fontStyle: "italic", color: COLOR.textFaint },
  /** The mono, upper-case micro-label above titles and sections. Write it in plain case. */
  eyebrow: {
    ...MONO,
    fontSize: FONT_SIZE.micro,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: COLOR.textFaint,
  },
  /** A line of mono text: what a set is, a clock, a countdown. */
  mono: { ...MONO, fontSize: FONT_SIZE.small },
  /** The mono small print: axis labels, tallies, what a chart shows. */
  monoCaption: { ...MONO, fontSize: FONT_SIZE.tiny, color: COLOR.textFaint },
  /** A number in the mono face: a stepper's value, a figure in a row. */
  monoValue: { ...MONO, fontSize: FONT_SIZE.base, fontWeight: 600 },
  /** A headline figure. */
  stat: {
    ...MONO,
    fontSize: FONT_SIZE.headline,
    fontWeight: 600,
    letterSpacing: TIGHT,
    lineHeight: 1.1,
  },
  /** The one figure a card is about. */
  bigStat: {
    ...MONO,
    fontSize: FONT_SIZE.jumbo,
    fontWeight: 600,
    letterSpacing: "-.03em",
    lineHeight: 1.1,
  },
} as const satisfies Record<string, CSSProperties>;

/** A kind of text: a key of `TEXT`. */
export type TextRole = keyof typeof TEXT;

/** One line of text, cut short with an ellipsis when it does not fit. */
export const ELLIPSIS: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
