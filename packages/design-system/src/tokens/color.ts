// Colours. The theme defines the CSS variables (see theme.ts); everything else
// names a colour through `COLOR`, never by spelling a `var(--…)` string.

/** Every colour the app paints with. The theme-following ones change with the theme. */
export const COLOR = {
  /** The window behind everything. */
  bg: "var(--bg)",
  /** A raised panel: cards, the sidebar, the top bar. */
  surface: "var(--surface)",
  /** A quiet fill on a panel: inset boxes, fields, tracks. */
  surfaceAlt: "var(--surface2)",
  /** The sheet of whatever floats over the page: a dialog, a menu, the toast. */
  modal: "var(--modal-bg)",
  /** Hairlines and borders. */
  line: "var(--line)",
  text: "var(--text)",
  /** Secondary text. */
  textMuted: "var(--text2)",
  /** Hints, captions and anything else that should recede. */
  textFaint: "var(--text3)",
  accent: "var(--accent)",
  success: "var(--accent2)",
  info: "var(--accent3)",
  /** An untrained region of the body map. */
  mapMuscle: "var(--map-muscle)",
  /** Fixed colours, the same in every theme. */
  danger: "#e05252",
  onAccent: "#fff",
  scrim: "rgba(0,0,0,.48)",
  none: "transparent",
} as const;

/**
 * What a colour says, for every `tone` prop: what it means (`accent`,
 * `success`, `info`, `danger`), how much it stands out (`strong`, `muted`,
 * `faint`), or that it sits on an accent fill (`onAccent`). `neutral` is each
 * component's own quiet default.
 */
export type Tone =
  | "neutral"
  | "strong"
  | "muted"
  | "faint"
  | "accent"
  | "success"
  | "info"
  | "danger"
  | "onAccent";

const TONE_COLOR: Record<Exclude<Tone, "neutral">, string> = {
  strong: COLOR.text,
  muted: COLOR.textMuted,
  faint: COLOR.textFaint,
  accent: COLOR.accent,
  success: COLOR.success,
  info: COLOR.info,
  danger: COLOR.danger,
  onAccent: COLOR.onAccent,
};

/** The colour of `tone`; null for `neutral`, which is each component's own quiet colour. */
export function toneColor(tone: Tone): string | null {
  return tone === "neutral" ? null : TONE_COLOR[tone];
}

/** How strong a translucent wash is: a barely-there fill, a selected fill, a soft border. */
const TINT = { wash: 6, soft: 15, edge: 30 } as const;

/** A translucent wash of a colour: `tint(COLOR.accent, "soft")`. */
export function tint(color: string, strength: keyof typeof TINT): string {
  return `color-mix(in oklch, ${color} ${TINT[strength]}%, transparent)`;
}

/** How much of a colour is mixed into the quiet fill. */
const SHADE = { low: 25, mid: 50, high: 70 } as const;

/** A colour mixed into the quiet fill, for heat scales and soft bars: `shade(COLOR.accent, "low")`. */
export function shade(color: string, strength: keyof typeof SHADE): string {
  return `color-mix(in oklch, ${color} ${SHADE[strength]}%, ${COLOR.surfaceAlt})`;
}
