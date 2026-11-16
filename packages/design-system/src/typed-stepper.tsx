import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { Direction } from "@nabd/domain";
import { FIELD_CLASS } from "./global-styles";
import { StepperFrame } from "./stepper-frame";
import type { StepperSize } from "./stepper-frame";
import { COLOR, HAIRLINE, RADIUS, SPACE, TEXT } from "./tokens";

export interface TypedStepperProps {
  value: number;
  onStep: (direction: Direction) => void;
  /** A number was typed. The owner decides whether to take it; `value` says what it kept. */
  onSet: (value: number) => void;
  /** Enter was pressed on a number that had been taken. */
  onEnter?: () => void;
  size?: StepperSize;
  /** Names the field. */
  ariaLabel?: string;
}

const INPUT: CSSProperties = {
  ...TEXT.monoValue,
  width: 64,
  boxSizing: "border-box",
  textAlign: "center",
  background: COLOR.surface,
  color: COLOR.text,
  border: HAIRLINE,
  borderRadius: RADIUS.chip,
  padding: `${SPACE.sm}px ${SPACE.xs}px`,
};

/** The number `text` spells — digits with at most one decimal point or comma — or null. */
function typedNumber(text: string): number | null {
  const spelled = text.trim().replace(",", ".");
  return /^(\d+\.?\d*|\.\d+)$/.test(spelled) ? Number(spelled) : null;
}

/**
 * A stepper whose value can be typed. While it is being typed in, the field
 * shows the text exactly as typed — it can be emptied, and nothing typed is
 * rounded or rewritten — and every time that text spells a number, the number
 * is offered to the owner. Leaving the field, or stepping, returns it to the
 * owner's value: the last number that was taken, if the text spelled none.
 *
 * ↑ and ↓ step like the + and − buttons, by the control's own step.
 */
export function TypedStepper(props: TypedStepperProps): JSX.Element {
  const { value, onSet, onEnter, ariaLabel, size = "large" } = props;
  const [draft, setDraft] = useState<string | null>(null);

  const step = (direction: Direction): void => {
    setDraft(null);
    props.onStep(direction);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      step(event.key === "ArrowUp" ? 1 : -1);
    } else if (event.key === "Enter" && (draft === null || typedNumber(draft) !== null)) {
      setDraft(null);
      onEnter?.();
    }
  };

  return (
    <StepperFrame onStep={step} size={size}>
      <input
        type="text"
        inputMode="decimal"
        role="spinbutton"
        className={FIELD_CLASS}
        aria-label={ariaLabel ?? "value"}
        aria-valuenow={value}
        value={draft ?? String(value)}
        onChange={(event) => {
          setDraft(event.target.value);
          const typed = typedNumber(event.target.value);
          if (typed !== null) onSet(typed);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={onKeyDown}
        style={INPUT}
      />
    </StepperFrame>
  );
}
