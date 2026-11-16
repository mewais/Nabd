import type { ReactNode } from "react";
import type { Direction } from "@nabd/domain";
import { StepperFrame } from "./stepper-frame";
import type { StepperSize } from "./stepper-frame";
import { TEXT } from "./tokens";
import { TypedStepper } from "./typed-stepper";
import type { TypedStepperProps } from "./typed-stepper";

/** Shows `value` as given. */
interface DisplayStepperProps {
  value: ReactNode;
  /** − was pressed (-1), or + (+1). */
  onStep: (direction: Direction) => void;
  onSet?: undefined;
  /** `large` (default) for forms; `mini` for dense table rows. */
  size?: StepperSize;
  /** What is being stepped: names the group. */
  ariaLabel?: string;
}

/** With `onSet` the value is shown in a field the user can also type into (see {@link TypedStepper}). */
type StepperProps = DisplayStepperProps | TypedStepperProps;

/** The width kept for a displayed value, in px, so the buttons do not move as it changes. */
const VALUE_WIDTH: Record<StepperSize, number> = { mini: 24, large: 56 };

/** A "− value +" control. With `onSet` the value can also be typed. */
export function Stepper(props: StepperProps): JSX.Element {
  if (props.onSet !== undefined) return <TypedStepper {...props} />;
  const { value, onStep, size = "large", ariaLabel } = props;
  return (
    <StepperFrame onStep={onStep} size={size} groupLabel={ariaLabel}>
      <span style={{ ...TEXT.monoValue, minWidth: VALUE_WIDTH[size], textAlign: "center" }}>
        {value}
      </span>
    </StepperFrame>
  );
}
