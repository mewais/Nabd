import { Card, Text } from "@nabd/design-system";

interface PlanNoteProps {
  text: string;
}

/** A quiet remark about today's plan, between the headline and the queue. */
export function PlanNote({ text }: PlanNoteProps): JSX.Element {
  return (
    <Card padding="lg">
      <Text variant="hint" tone="muted">
        {text}
      </Text>
    </Card>
  );
}
