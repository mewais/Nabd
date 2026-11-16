import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { Direction } from "@nabd/domain";
import { FIELD_CLASS } from "./global-styles";
import { COLOR, HAIRLINE, RADIUS, SPACE, TEXT } from "./tokens";

export interface NumberFieldProps {
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
 * A field a number is typed into. While it is being typed in, the field shows
 * the text exactly as typed — it can be emptied, and nothing typed is rounded
 * or rewritten — and every time that text spells a number, the number is
 * offered to the owner (an emptied field, to `onClear`, if there is one).
 * Leaving the field, or stepping it, returns it to the owner's value: the
 * last number that was taken, if the text spelled none.
 */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const { value, onSet, onClear, onStep, onEnter, ariaLabel, placeholder } = props;
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value === null ? "" : String(value);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (onStep && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      setDraft(null);
      onStep(event.key === "ArrowUp" ? 1 : -1);
    } else if (event.key === "Enter" && (draft === null || typedNumber(draft) !== null)) {
      setDraft(null);
      onEnter?.();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      role={onStep ? "spinbutton" : undefined}
      className={FIELD_CLASS}
      aria-label={ariaLabel}
      aria-valuenow={onStep && value !== null ? value : undefined}
      placeholder={placeholder}
      value={draft ?? shown}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const typed = typedNumber(text);
        if (typed !== null) onSet(typed);
        else if (text.trim() === "") onClear?.();
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={onKeyDown}
      style={INPUT}
    />
  );
}
