import { Card, EmptyNote, Stack } from "@nabd/design-system";
import type { InsightRowVM } from "./coverage-vm";
import { InsightRow } from "./insight-row";

interface InsightCardProps {
  vm: InsightRowVM[];
}

/** Which muscles to rest and which to push, from the week's coverage. */
export function InsightCard({ vm }: InsightCardProps): JSX.Element {
  return (
    <Card title="Volume insight">
      <Stack gap="md">
        {vm.length === 0 && (
          <EmptyNote>Nothing stands out yet — log a few sets and this fills in.</EmptyNote>
        )}
        {vm.map((row) => (
          <InsightRow key={row.kind} vm={row} />
        ))}
      </Stack>
    </Card>
  );
}
