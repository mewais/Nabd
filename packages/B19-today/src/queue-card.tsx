import { Card, TEXT } from "@nabd/design-system";
import { QueueRow } from "./queue-row";
import type { QueueRowVM } from "./queue-vm";

export interface QueueCardProps {
  dayName: string | null;
  rows: QueueRowVM[];
  onStart: (itemId: string) => void;
  onToggleSkip: (itemId: string) => void;
}

/** Today's exercises in order. Any of them can be started, whatever the order. */
export function QueueCard({ dayName, rows, onStart, onToggleSkip }: QueueCardProps): JSX.Element {
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "18px 20px 14px",
        }}
      >
        <div style={TEXT.cardTitle}>{"Today's rhythm"}</div>
        {dayName !== null && <div style={{ fontSize: 12, color: "var(--text3)" }}>{dayName}</div>}
      </div>
      {rows.map((row) => (
        <QueueRow key={row.id} row={row} onStart={onStart} onToggleSkip={onToggleSkip} />
      ))}
    </Card>
  );
}
