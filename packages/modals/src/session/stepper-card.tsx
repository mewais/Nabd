import { Card, Eyebrow, Stepper } from "@nabd/design-system";
import type { Direction } from "@nabd/domain";

interface StepperCardProps {
  label: string;
  value: number;
  onStep: (direction: Direction) => void;
  onSet: (value: number) => void;
  /** Enter in the field: log the set. */
  onEnter: () => void;
}

/** One number of the set being logged: stepped with −/+ (or ↑/↓), or typed. */
export function StepperCard({
  label,
  value,
  onStep,
  onSet,
  onEnter,
}: StepperCardProps): JSX.Element {
  return (
    <Card variant="inset" stacked padding={14} style={{ flex: 1, alignItems: "center", gap: 10 }}>
      <Eyebrow>{label}</Eyebrow>
      <Stepper value={value} onStep={onStep} onSet={onSet} onEnter={onEnter} ariaLabel={label} />
    </Card>
  );
}
