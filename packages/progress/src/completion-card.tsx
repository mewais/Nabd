import { BarChart, Card, EmptyNote, Row, Spacer, Stack, Text } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { CompletionVM } from "./stats-vm";

interface CompletionCardProps {
  vm: CompletionVM | EmptyVM;
}

/** The share of planned sets that got done: this week, and day by day. */
export function CompletionCard({ vm }: CompletionCardProps): JSX.Element {
  return (
    <Card title="Completion rate" subtitle="Planned sets actually done" stacked>
      {isEmpty(vm) ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <Stack gap="sm" grow>
          <Row gap="sm" align="baseline">
            <Text as="span" variant="bigStat" tone="accent">
              {vm.weekPct}
            </Text>
            <Text as="span" variant="hint">
              this week
            </Text>
          </Row>
          <Spacer />
          <Stack gap="sm">
            <Text variant="eyebrow">Last 7 days</Text>
            <BarChart bars={vm.days} size="sm" tone="success" ariaLabel="Completion by day" />
          </Stack>
        </Stack>
      )}
    </Card>
  );
}
