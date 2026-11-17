import type { CSSProperties } from "react";
import { Icon } from "./icon";
import { CENTERED } from "./styles";
import { COLOR, HAIRLINE, RADIUS } from "./tokens";
import type { IconSize, Size } from "./tokens";

/** Where something stands: still to do, the one in play, or done. */
type CheckState = "todo" | "next" | "done";
/** `sm` marks a row; `lg` is a celebration. */
type CheckMarkSize = Extract<Size, "sm" | "lg">;

interface CheckMarkProps {
  state: CheckState;
  size?: CheckMarkSize;
  /** What the mark says here ("Done", "Up next"), for assistive tech. */
  ariaLabel?: string;
}

const SIZES: Record<CheckMarkSize, { box: number; icon: IconSize; dot: number }> = {
  sm: { box: 18, icon: "xs", dot: 8 },
  lg: { box: 56, icon: "xxl", dot: 24 },
};

const BORDER: Record<CheckState, CSSProperties["border"]> = {
  todo: HAIRLINE,
  next: `1.5px solid ${COLOR.accent}`,
  done: "none",
};

/**
 * A round mark of where something stands. Each state has a shape of its own —
 * an empty ring, a ring with a dot, a tick — so the colour is never the only
 * thing that tells them apart.
 */
export function CheckMark({ state, size = "sm", ariaLabel }: CheckMarkProps): JSX.Element {
  const { box, icon, dot } = SIZES[size];
  return (
    <span
      role={ariaLabel === undefined ? undefined : "img"}
      aria-label={ariaLabel}
      style={{
        ...CENTERED,
        width: box,
        height: box,
        borderRadius: RADIUS.round,
        background: state === "done" ? COLOR.success : COLOR.surface,
        border: BORDER[state],
      }}
    >
      {state === "done" && (
        <Icon name="check" size={icon} weight={size === "sm" ? "black" : "heavy"} tone="onAccent" />
      )}
      {state === "next" && (
        <span
          style={{ width: dot, height: dot, borderRadius: RADIUS.round, background: COLOR.accent }}
        />
      )}
    </span>
  );
}
