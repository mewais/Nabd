import { Button, Card, Eyebrow, RADIUS, TEXT } from "@nabd/design-system";

export interface RestCardProps {
  /** "Tue" */
  label: string;
  onAddDay: () => void;
}

/** A weekday with no training day yet. */
export function RestCard({ label, onAddDay }: RestCardProps): JSX.Element {
  return (
    <Card
      padding={11}
      style={{
        borderRadius: RADIUS.tile,
        minHeight: 150,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div style={{ ...TEXT.label, color: "var(--text3)", margin: "5px 0 auto" }}>Rest</div>
      <Button
        variant="ghost"
        size="sm"
        dashed
        block
        ariaLabel={`Add a day on ${label}`}
        onClick={onAddDay}
      >
        + Add day
      </Button>
    </Card>
  );
}
