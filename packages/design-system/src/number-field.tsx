import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { Direction } from "@nabd/domain";
import { ENTERED_DECIMALS, roundTo } from "@nabd/domain";
import { InputBase } from "./input-base";
import { pad } from "./styles";
import { COLOR, HAIRLINE, RADIUS, TEXT } from "./tokens";

interface NumberFieldProps {
  /** The owner's number; null shows an empty field. */
  value: number | null;
  /** A number was typed. The owner decides whether to take it; `value` says what it kept. */
  onSet: (value: number) => void;
  /** The field was emptied. Without it, an empty field is just text on the way to a number. */
  onClear?: () => void;
  /** ↑ or ↓ was pressed: the field is a spin button, stepped by its owner. */
  onStep?: (direction: Direction) => void;
  /** Enter was pressed on a number that had been taken. */
  onEnter?: () => void;
  /** Names the field. */
  ariaLabel: string;
  /** Shown while the field is empty. */
  placeholder?: string;
  /** The decimals the field holds (by default, a weight's two); a finer number is rounded to them. */
  decimals?: number;
}

const INPUT: CSSProperties = {
  ...TEXT.monoValue,
  width: 64,
  textAlign: "center",
  background: COLOR.surface,
  border: HAIRLINE,
  borderRadius: RADIUS.chip,
  padding: pad("sm", "xs"),
};

/**
 * The number `text` spells — digits with at most one decimal point or comma —
 * rounded to `decimals`, or null.
 */
function typedNumber(text: string, decimals: number): number | null {
  const spelled = text.trim().replace(",", ".");
  return /^(\d+\.?\d*|\.\d+)$/.test(spelled) ? roundTo(Number(spelled), decimals) : null;
}

/**
 * A field a number is typed into. While it is being typed in, the field shows
 * the text exactly as typed — it can be emptied, and nothing typed is
 * rewritten — and every time that text spells a number, the number, rounded
 * to the field's decimals, is offered to the owner (an emptied field, to
 * `onClear`, if there is one). Enter on a number the owner took calls
 * `onEnter` at once, so a number typed finer than the field holds is entered
 * as its rounded value in one press; Enter on a number it did not take only
 * brings back what it kept. Leaving the field, or stepping it, returns it to
 * the owner's value: the last number that was taken, if the text spelled none.
 */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const { value, onSet, onClear, onStep, onEnter, ariaLabel, placeholder } = props;
  const { decimals = ENTERED_DECIMALS } = props;
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value === null ? "" : String(value);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (onStep && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      setDraft(null);
      onStep(event.key === "ArrowUp" ? 1 : -1);
    } else if (event.key === "Enter") {
      const typed = draft === null ? value : typedNumber(draft, decimals);
      if (draft !== null && typed === null) return;
      // A number the owner would not take is not entered: the field shows what it kept instead.
      setDraft(null);
      if (typed === value) onEnter?.();
    }
  };

  return (
    <InputBase
      type="text"
      inputMode="decimal"
      role={onStep ? "spinbutton" : undefined}
      aria-label={ariaLabel}
      aria-valuenow={onStep && value !== null ? value : undefined}
      placeholder={placeholder}
      value={draft ?? shown}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const typed = typedNumber(text, decimals);
        if (typed !== null) onSet(typed);
        else if (text.trim() === "") onClear?.();
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={onKeyDown}
      style={INPUT}
    />
  );
}
