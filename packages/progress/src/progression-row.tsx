import { Chip, Grid, Icon, Row, RowButton, Sparkline, Text } from "@nabd/design-system";
import type { GridColumns } from "@nabd/design-system";
import type { ProgressActions } from "./progress-actions";
import type { ProgressionRowVM } from "./progress-vm";

/** The table's columns: exercise, trend, best, gain, chevron. */
export const PROGRESSION_COLUMNS: GridColumns = [1.3, 1.5, "figure", "figure", "icon"];

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
          <Icon name="trophy" size="xs" tone="accent" />
          <Text as="span" variant="monoValue">
            {vm.best}
          </Text>
        </Row>
        <Chip variant="entry" tone={vm.up ? "success" : "neutral"}>
          {vm.gain}
        </Chip>
        <Icon name="chevron-right" size="sm" tone="faint" />
      </Grid>
    </RowButton>
  );
}
