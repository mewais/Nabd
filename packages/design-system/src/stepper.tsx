import { useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import type { Direction } from "@nabd/domain";
import { RADIUS, SURFACE2_BOX, TEXT } from "./tokens";

type StepperSize = "mini" | "large";

interface StepperBaseProps {
  /** − was pressed (-1), or + (+1). */
  onStep: (direction: Direction) => void;
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

/** Shows `value` in a field the user can also type into (see {@link TypedStepper}). */
interface TypedStepperProps extends StepperBaseProps {
  value: number;
  /** A number was typed. The owner decides whether to take it; `value` says what it kept. */
  onSet: (value: number) => void;
  /** Enter was pressed on a number that had been taken. */
  onEnter?: () => void;
}

type StepperProps = DisplayStepperProps | TypedStepperProps;

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
};

/** The number `text` spells — digits with at most one decimal point or comma — or null. */
function typedNumber(text: string): number | null {
  const spelled = text.trim().replace(",", ".");
  return /^(\d+\.?\d*|\.\d+)$/.test(spelled) ? Number(spelled) : null;
}

interface FrameProps {
  onStep: (direction: Direction) => void;
  size: StepperSize;
  /** Names the group, when the value inside does not carry the name itself. */
  groupLabel?: string | undefined;
  /** The value between the two buttons. */
  children: (spec: SizeSpec) => ReactNode;
}

/** The "− … +" around a stepper's value. */
function Frame({ onStep, size, groupLabel, children }: FrameProps): JSX.Element {
  const spec = SIZES[size];
  const buttonStyle = { ...BUTTON, ...spec.button };
  return (
    <div
      role="group"
      aria-label={groupLabel}
      style={{ display: "flex", alignItems: "center", gap: spec.gap }}
    >
      <button type="button" aria-label="decrease" onClick={() => onStep(-1)} style={buttonStyle}>
        −
      </button>
      {children(spec)}
      <button type="button" aria-label="increase" onClick={() => onStep(1)} style={buttonStyle}>
        +
      </button>
    </div>
  );
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
function TypedStepper(props: TypedStepperProps): JSX.Element {
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
    <Frame onStep={step} size={size}>
      {() => (
        <input
          type="text"
          inputMode="decimal"
          role="spinbutton"
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
      )}
    </Frame>
  );
}

/** A "− value +" control. With `onSet` the value can also be typed. */
export function Stepper(props: StepperProps): JSX.Element {
  if (props.onSet !== undefined) return <TypedStepper {...props} />;
  const { value, onStep, size = "large", ariaLabel } = props;
  return (
    <Frame onStep={onStep} size={size} groupLabel={ariaLabel}>
      {(spec) => (
        <span style={{ ...TEXT.monoValue, ...spec.value, textAlign: "center" }}>{value}</span>
      )}
    </Frame>
  );
}
