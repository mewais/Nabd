import { Card } from "@nabd/design-system";

interface PlanNoteProps {
  text: string;
}

/** A quiet remark about today's plan, between the headline and the queue. */
export function PlanNote({ text }: PlanNoteProps): JSX.Element {
  return (
    <Card padding="12px 20px" style={{ fontSize: 12.5, color: "var(--text2)" }}>
      {text}
    </Card>
  );
}
