import { Icon } from "./icon";
import { COLOR, HAIRLINE, RADIUS } from "./tokens";

interface CheckMarkProps {
  /** Done: a filled disc with a tick. Not done: an empty ring. */
  checked: boolean;
  /** Not done, but the one in play: the ring turns accent and gets a dot. */
  current?: boolean;
  /** `sm` marks a row; `lg` is a celebration. */
  size?: "sm" | "lg";
  /** What the mark says here ("Done", "Up next"), for assistive tech. */
  label?: string;
}

const SIZES = {
  sm: { box: 18, icon: 12, stroke: 3.4, dot: 8 },
  lg: { box: 56, icon: 28, stroke: 2.6, dot: 24 },
} as const;

/**
 * A round mark of where something stands: to do, in play, or done. Each state
 * has a shape of its own — an empty ring, a ring with a dot, a tick — so the
 * colour is never the only thing that tells them apart.
 */
export function CheckMark(props: CheckMarkProps): JSX.Element {
  const { checked, current = false, size = "sm", label } = props;
  const { box, icon, stroke, dot } = SIZES[size];
  const accented = current && !checked;
  return (
    <span
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        boxSizing: "border-box",
        width: box,
        height: box,
        borderRadius: RADIUS.round,
        background: checked ? COLOR.success : COLOR.surface,
        border: checked ? "none" : accented ? `1.5px solid ${COLOR.accent}` : HAIRLINE,
      }}
    >
      {checked && <Icon name="check" size={icon} strokeWidth={stroke} tone="onAccent" />}
      {accented && (
        <span
          style={{ width: dot, height: dot, borderRadius: RADIUS.round, background: COLOR.accent }}
        />
      )}
    </span>
  );
}
