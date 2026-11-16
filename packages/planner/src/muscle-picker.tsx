import { MUSCLE_OPTIONS } from "@nabd/bodymap";
import type { MuscleKey } from "@nabd/domain";
import { Button, Card, Row, Stack, Text } from "@nabd/design-system";

interface MusclePickerProps {
  onPick: (muscle: MuscleKey) => void;
}

/** Every muscle, to add as a slot of a cycled day. */
export function MusclePicker({ onPick }: MusclePickerProps): JSX.Element {
  return (
    <Card variant="dashed" padding="md">
      <Stack gap="sm">
        <Text variant="eyebrow">+ Add muscle</Text>
        <Row role="group" ariaLabel="Add muscle" gap="sm" wrap>
          {MUSCLE_OPTIONS.map(({ value, label }) => (
            <Button key={value} variant="secondary" size="sm" onClick={() => onPick(value)}>
              {label}
            </Button>
          ))}
        </Row>
      </Stack>
    </Card>
  );
}
