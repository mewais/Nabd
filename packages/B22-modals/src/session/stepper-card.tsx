import { Eyebrow, RADIUS, SURFACE2_BOX, Stepper } from "@nabd/design-system";

interface StepperCardProps {
  label: string;
  value: number;
  onStep: (direction: number) => void;
  onSet: (value: number) => void;
}

/** One number of the set being logged: stepped with −/+ or typed. */
export function StepperCard({ label, value, onStep, onSet }: StepperCardProps): JSX.Element {
  return (
    <div
      style={{
        ...SURFACE2_BOX,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        borderRadius: RADIUS.tile,
        padding: 14,
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <Stepper
        value={value}
        onDec={() => onStep(-1)}
        onInc={() => onStep(1)}
        onSet={onSet}
        ariaLabel={label}
      />
    </div>
  );
}
