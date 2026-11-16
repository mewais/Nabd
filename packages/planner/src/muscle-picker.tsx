import { MUSCLES_ANATOMICAL, MUSCLE_NAMES } from "@nabd/domain";
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
          {MUSCLES_ANATOMICAL.map((muscle) => (
            <Button key={muscle} variant="secondary" size="sm" onClick={() => onPick(muscle)}>
              {MUSCLE_NAMES[muscle]}
            </Button>
          ))}
        </Row>
      </Stack>
    </Card>
  );
}
