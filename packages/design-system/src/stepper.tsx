import type { CSSProperties, ReactNode } from "react";
import { RADIUS, SURFACE2_BOX, TEXT } from "./tokens";

export type StepperSize = "mini" | "large";

interface StepperBaseProps {
  onDec: () => void;
  onInc: () => void;
  /** `large` (default) for forms; `mini` for dense table rows. */
  size?: StepperSize;
  /** What is being stepped: names the typed input, or the group when there is none. */
  ariaLabel?: string;
}

/** Shows `value` as given. */
interface DisplayStepperProps extends StepperBaseProps {
  value: ReactNode;
  onSet?: undefined;
}

/** Shows `value` in an input the user can also type into. */
interface TypedStepperProps extends StepperBaseProps {
  value: number;
  onSet: (value: number) => void;
}

export type StepperProps = DisplayStepperProps | TypedStepperProps;

interface SizeSpec {
  gap: number;
  button: CSSProperties;
  value: CSSProperties;
}

const SIZES: Record<StepperSize, SizeSpec> = {
  mini: {
    gap: 4,
    button: { ...SURFACE2_BOX, width: 22, height: 22, borderRadius: RADIUS.tag, fontSize: 14 },
    value: { fontSize: 13, minWidth: 24 },
  },
  large: {
    gap: 12,
    button: {
      background: "var(--surface)",
      border: "1px solid var(--line)",
      width: 30,
      height: 30,
      borderRadius: RADIUS.chip,
      fontSize: 17,
      color: "var(--text)",
    },
    value: { fontSize: 14, minWidth: 56 },
  },
};

const BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  padding: 0,
  lineHeight: 1,
  color: "var(--text2)",
  fontFamily: "inherit",
  cursor: "pointer",
};

const INPUT: CSSProperties = {
  ...TEXT.monoValue,
  fontSize: 14,
  width: 64,
  textAlign: "center",
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  borderRadius: RADIUS.chip,
  padding: "5px 4px",
  outline: "none",
  MozAppearance: "textfield",
};

/** A "− value +" control. With `onSet` the value can also be typed. */
export function Stepper(props: StepperProps): JSX.Element {
  const { onDec, onInc, size = "large", ariaLabel } = props;
  const spec = SIZES[size];
  const buttonStyle = { ...BUTTON, ...spec.button };
  const typed = props.onSet !== undefined;

  return (
    <div
      role="group"
      aria-label={typed ? undefined : ariaLabel}
      style={{ display: "flex", alignItems: "center", gap: spec.gap }}
    >
      <button type="button" aria-label="decrease" onClick={onDec} style={buttonStyle}>
        −
      </button>
      {props.onSet !== undefined ? (
        <input
          type="number"
          value={props.value}
          aria-label={ariaLabel ?? "value"}
          onChange={(event) => {
            const typed = parseFloat(event.target.value);
            if (!Number.isNaN(typed)) props.onSet(typed);
          }}
          style={INPUT}
        />
      ) : (
        <span style={{ ...TEXT.monoValue, ...spec.value, textAlign: "center" }}>{props.value}</span>
      )}
      <button type="button" aria-label="increase" onClick={onInc} style={buttonStyle}>
        +
      </button>
    </div>
  );
}
