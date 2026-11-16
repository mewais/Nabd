import { ANIMATION } from "./global-styles";
import { COLOR, RADIUS } from "./tokens";

interface LiveDotProps {
  /** Something needs attention now: the dot is lit in the accent, and pulses. */
  on: boolean;
}

const SIZE = 8;

/** A small status dot. Decorative: the words beside it say what it means. */
export function LiveDot({ on }: LiveDotProps): JSX.Element {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        flex: "none",
        width: SIZE,
        height: SIZE,
        borderRadius: RADIUS.round,
        background: on ? COLOR.accent : COLOR.textFaint,
        animation: on ? ANIMATION.blink : undefined,
      }}
    />
  );
}
