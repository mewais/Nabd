import { Chip, Grid, Icon, Row, RowButton, Sparkline, Text } from "@nabd/design-system";
import type { ProgressActions } from "./progress-actions";
import type { ProgressionRowVM } from "./progress-vm";

/** The table's columns: exercise, trend, best, gain, chevron. */
export const PROGRESSION_COLUMNS = "1.3fr 1.5fr 132px 132px 16px";

interface ProgressionRowProps {
  vm: ProgressionRowVM;
  actions: Pick<ProgressActions, "openChart">;
}

/** One exercise: its trend line, personal best and gain. Pressing it opens the full history. */
export function ProgressionRow({ vm, actions }: ProgressionRowProps): JSX.Element {
  return (
    <RowButton onClick={() => actions.openChart(vm.exId)}>
      <Grid as="span" columns={PROGRESSION_COLUMNS} gap="lg" align="center">
        <Text as="span" variant="rowLabel">
          {vm.exercise}
        </Text>
        <Sparkline series={vm.series} />
        <Row as="span" justify="end" gap="xs">
          <Icon name="trophy" size={12} tone="accent" />
          <Text as="span" variant="monoValue">
            {vm.best}
          </Text>
        </Row>
        <Chip variant="box" tone={vm.up ? "success" : "neutral"}>
          {vm.gain}
        </Chip>
        <Icon name="chevron-right" size={14} tone="faint" />
      </Grid>
    </RowButton>
  );
}
