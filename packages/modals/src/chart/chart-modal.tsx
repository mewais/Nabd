import { Card, LineChart, ModalShell, Row, Stack, StatTile, Text } from "@nabd/design-system";
import type { ChartActions } from "./chart-actions";
import type { ChartVM } from "./chart-vm";

interface ChartModalProps {
  vm: ChartVM;
  actions: ChartActions;
}

/** One exercise's whole history: its headline figures over a line chart. */
export function ChartModal({ vm, actions }: ChartModalProps): JSX.Element {
  return (
    <ModalShell
      eyebrow="Full history"
      title={vm.exercise}
      subtitle={vm.subtitle}
      onClose={actions.close}
      width="lg"
      layer="modalOver"
    >
      <Stack gap="xl" paddingX="xxl" paddingY="xl">
        <Row gap="sm" align="stretch">
          {vm.stats.map((stat) => (
            <StatTile key={stat.label} variant="inset" {...stat} />
          ))}
        </Row>
        <Card variant="inset" padding="md">
          <LineChart series={vm.series} ariaLabel={vm.chartLabel} />
          <Row justify="between" paddingX="sm">
            <Text as="span" variant="monoCaption">
              {vm.startLabel}
            </Text>
            <Text as="span" variant="monoCaption">
              {vm.endLabel}
            </Text>
          </Row>
        </Card>
      </Stack>
    </ModalShell>
  );
}
