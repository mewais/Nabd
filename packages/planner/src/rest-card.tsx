import { Button, Card, Eyebrow, TEXT } from "@nabd/design-system";
import type { RestColumnVM } from "./board-vm";

interface RestCardProps {
  column: RestColumnVM;
  onAddDay: (weekday: number) => void;
}

/** A weekday with no training day yet. */
export function RestCard({ column, onAddDay }: RestCardProps): JSX.Element {
  return (
    <Card
      variant="tile"
      padding={11}
      style={{
        minHeight: 150,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Eyebrow>{column.label}</Eyebrow>
      <div style={{ ...TEXT.label, color: "var(--text3)", margin: "5px 0 auto" }}>Rest</div>
      <Button
        variant="ghost"
        size="sm"
        dashed
        block
        ariaLabel={column.addLabel}
        onClick={() => onAddDay(column.weekday)}
      >
        + Add day
      </Button>
    </Card>
  );
}
