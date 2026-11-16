import { COLOR } from "./tokens";

export interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  /** Names the switch for assistive tech. */
  ariaLabel?: string;
}

const WIDTH = 40;
const HEIGHT = 24;
const KNOB = HEIGHT - 4;

/** An on/off switch. */
export function Toggle({ on, onChange, ariaLabel }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        borderRadius: HEIGHT / 2,
        background: on ? "var(--accent)" : "var(--surface2)",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? WIDTH - KNOB - 2 : 2,
          width: KNOB,
          height: KNOB,
          borderRadius: "50%",
          background: COLOR.onAccent,
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}
