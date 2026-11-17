import { ButtonBase } from "./button-base";
import { COLOR, RADIUS, SPACE } from "./tokens";

interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  /** Names the switch for assistive tech. */
  ariaLabel?: string;
  /** The setting does not apply here: the switch is shown, dimmed, and cannot be flipped. */
  disabled?: boolean;
}

const WIDTH = 40;
const HEIGHT = 24;
const INSET = SPACE.xxs;
const KNOB = HEIGHT - 2 * INSET;

/** An on/off switch. */
export function Toggle({ on, onChange, ariaLabel, disabled = false }: ToggleProps): JSX.Element {
  return (
    <ButtonBase
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        position: "relative",
        flex: "none",
        width: WIDTH,
        height: HEIGHT,
        borderRadius: RADIUS.pill,
        background: on ? COLOR.accent : COLOR.surfaceAlt,
        boxShadow: on ? undefined : `inset 0 0 0 1px ${COLOR.line}`,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: INSET,
          left: on ? WIDTH - KNOB - INSET : INSET,
          width: KNOB,
          height: KNOB,
          borderRadius: RADIUS.round,
          background: COLOR.onAccent,
          transition: "left 0.2s",
        }}
      />
    </ButtonBase>
  );
}
