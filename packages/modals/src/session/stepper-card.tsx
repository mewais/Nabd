import { Card, Stack, Stepper, Text } from "@nabd/design-system";
import type { Direction } from "@nabd/domain";

interface StepperCardProps {
  label: string;
  value: number;
  onStep: (direction: Direction) => void;
  onSet: (value: number) => void;
  /** Enter in the field: log the set. */
  onEnter: () => void;
  /** The decimals the field holds. */
  decimals: number;
}

/** One number of the set being logged: stepped with −/+ (or ↑/↓), or typed. */
export function StepperCard({
  label,
  value,
  onStep,
  onSet,
  onEnter,
  decimals,
}: StepperCardProps): JSX.Element {
  return (
    <Card variant="inset" padding="lg" grow>
      <Stack align="center" gap="sm">
        <Text variant="eyebrow">{label}</Text>
        <Stepper
          value={value}
          onStep={onStep}
          onSet={onSet}
          onEnter={onEnter}
          ariaLabel={label}
          decimals={decimals}
        />
      </Stack>
    </Card>
  );
}
