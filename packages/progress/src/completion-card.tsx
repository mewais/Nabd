import { BarChart, Card, EmptyNote, Row, Spacer, Stack, Text } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { CompletionVM } from "./completion-vm";
import { WORDS } from "./wording";

interface CompletionCardProps {
  vm: CompletionVM | EmptyVM;
}

/** The share of planned sets that got done: this week, and day by day. */
export function CompletionCard({ vm }: CompletionCardProps): JSX.Element {
  return (
    <Card title={WORDS.completion} subtitle={WORDS.completionHint}>
      {isEmpty(vm) ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <Stack gap="sm" grow>
          <Row gap="sm" align="baseline">
            <Text as="span" variant="bigStat" tone="accent">
              {vm.weekPct}
            </Text>
            <Text as="span" variant="hint">
              {WORDS.thisWeek}
            </Text>
          </Row>
          <Spacer />
          <Stack gap="sm">
            <Text variant="eyebrow">{WORDS.lastSevenDays}</Text>
            <BarChart bars={vm.days} size="sm" tone="success" ariaLabel={WORDS.completionByDay} />
          </Stack>
        </Stack>
      )}
    </Card>
  );
}
