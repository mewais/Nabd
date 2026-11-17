import { COLOR, RADIUS, toneColor } from "./tokens";
import type { Tone } from "./tokens";

interface SwatchProps {
  /** What the colour says; `neutral` is a faint grey. */
  tone?: Tone;
  /** `dot` marks a row's state; `square` keys a chart's legend. */
  shape?: "dot" | "square";
  /** An outline instead of a fill: "not yet", beside filled dots that say "now". */
  hollow?: boolean;
  /** What the mark says, in words, for assistive tech. */
  ariaLabel?: string;
}

const SIZE = { dot: 8, square: 12 } as const;

/** A small patch of colour. Where it carries meaning, give it an `ariaLabel` — and a shape of its own. */
export function Swatch({
  tone = "neutral",
  shape = "dot",
  hollow = false,
  ariaLabel,
}: SwatchProps): JSX.Element {
  const color = toneColor(tone) ?? COLOR.textFaint;
  return (
    <span
      role={ariaLabel === undefined ? undefined : "img"}
      aria-label={ariaLabel}
      style={{
        display: "inline-block",
        flex: "none",
        width: SIZE[shape],
        height: SIZE[shape],
        borderRadius: shape === "dot" ? RADIUS.round : RADIUS.bar,
        background: hollow ? COLOR.none : color,
        border: hollow ? `1.5px solid ${color}` : undefined,
      }}
    />
  );
}
