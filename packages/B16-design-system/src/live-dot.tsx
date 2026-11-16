import { ANIMATION } from "./global-styles";

export interface LiveDotProps {
  /** Something needs attention now: the dot turns accent and pulses. */
  active: boolean;
}

/** A small status dot. */
export function LiveDot({ active }: LiveDotProps): JSX.Element {
  return (
    <span
      data-active={active}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "var(--accent)" : "var(--text3)",
        animation: active ? ANIMATION.blink : undefined,
      }}
    />
  );
}
