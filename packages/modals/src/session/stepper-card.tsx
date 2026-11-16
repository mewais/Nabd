import { Card, Eyebrow, Stepper } from "@nabd/design-system";

interface StepperCardProps {
  label: string;
  value: number;
  onStep: (direction: number) => void;
  onSet: (value: number) => void;
}

/** One number of the set being logged: stepped with −/+ or typed. */
export function StepperCard({ label, value, onStep, onSet }: StepperCardProps): JSX.Element {
  return (
    <Card variant="inset" stacked padding={14} style={{ flex: 1, alignItems: "center", gap: 10 }}>
      <Eyebrow>{label}</Eyebrow>
      <Stepper
        value={value}
        onDec={() => onStep(-1)}
        onInc={() => onStep(1)}
        onSet={onSet}
        ariaLabel={label}
      />
    </Card>
  );
}
