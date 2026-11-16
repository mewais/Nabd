import { ANIMATION } from "./global-styles";
import { COLOR, RADIUS } from "./tokens";

interface LiveDotProps {
  /** Something needs attention now: the dot turns accent and pulses. */
  active: boolean;
}

const SIZE = 8;

/** A small status dot. Decorative: the words beside it say what it means. */
export function LiveDot({ active }: LiveDotProps): JSX.Element {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        flex: "none",
        width: SIZE,
        height: SIZE,
        borderRadius: RADIUS.round,
        background: active ? COLOR.accent : COLOR.textFaint,
        animation: active ? ANIMATION.blink : undefined,
      }}
    />
  );
}
