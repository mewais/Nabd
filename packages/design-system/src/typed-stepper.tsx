import { useState } from "react";
import type { Direction } from "@nabd/domain";
import { NumberField } from "./number-field";
import { StepperFrame } from "./stepper-frame";
import type { StepperSize } from "./stepper-frame";

export interface TypedStepperProps {
  value: number;
  onStep: (direction: Direction) => void;
  /** A number was typed. The owner decides whether to take it; `value` says what it kept. */
  onSet: (value: number) => void;
  /** Enter was pressed on a number that had been taken. */
  onEnter?: () => void;
  size?: StepperSize;
  /** Names the field, and its − and + after it ("Decrease reps"). */
  ariaLabel: string;
}

/**
 * A stepper whose value can be typed (see {@link NumberField}). ↑ and ↓ in
 * the field step like the + and − buttons, by the control's own step, and
 * stepping lets go of whatever was half typed.
 */
export function TypedStepper(props: TypedStepperProps): JSX.Element {
  const { value, onStep, onSet, onEnter, ariaLabel, size = "md" } = props;
  // A fresh field after each press of − or +: what was half typed is dropped.
  const [presses, setPresses] = useState(0);
  const step = (direction: Direction): void => {
    setPresses(presses + 1);
    onStep(direction);
  };
  return (
    <StepperFrame onStep={step} size={size} name={ariaLabel}>
      <NumberField
        key={presses}
        value={value}
        onSet={onSet}
        onStep={onStep}
        onEnter={onEnter}
        ariaLabel={ariaLabel}
      />
    </StepperFrame>
  );
}
