import { Card, TEXT } from "@nabd/design-system";
import { QueueRow } from "./queue-row";
import type { QueueVM } from "./queue-vm";
import type { TodayActions } from "./today-actions";

interface QueueCardProps {
  vm: QueueVM;
  actions: Pick<TodayActions, "start" | "toggleSkip">;
}

/** Today's exercises in order. Any of them can be started, whatever the order. */
export function QueueCard({ vm, actions }: QueueCardProps): JSX.Element {
  return (
    <Card ariaLabel="Today's rhythm" padding={0} style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "18px 20px 14px",
        }}
      >
        <div style={TEXT.cardTitle}>{"Today's rhythm"}</div>
        {vm.dayName !== null && <div style={TEXT.hint}>{vm.dayName}</div>}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {vm.rows.map((row) => (
          <QueueRow key={row.id} vm={row} actions={actions} />
        ))}
      </ul>
    </Card>
  );
}
