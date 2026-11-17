import { Card, Stack, Text } from "@nabd/design-system";
import { QueueRow } from "./queue-row";
import type { QueueVM } from "./queue-vm";
import type { TodayActions } from "./today-actions";
import { WORDS } from "./wording";

interface QueueCardProps {
  vm: QueueVM;
  actions: Pick<TodayActions, "start" | "toggleSkip">;
}

/** Today's exercises in order. Any of them can be started, whatever the order. */
export function QueueCard({ vm, actions }: QueueCardProps): JSX.Element {
  return (
    <Card
      title={WORDS.rhythm}
      action={vm.dayName === null ? undefined : <Text variant="hint">{vm.dayName}</Text>}
      flush
    >
      <Stack as="ul">
        {vm.rows.map((row) => (
          <QueueRow key={row.id} vm={row} actions={actions} />
        ))}
      </Stack>
    </Card>
  );
}
