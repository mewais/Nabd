import { Card, EmptyNote, Grid, Stack, Text } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { ProgressActions } from "./progress-actions";
import type { ProgressionRowVM } from "./progress-vm";
import { PROGRESSION_COLUMNS, ProgressionRow } from "./progression-row";

interface ProgressionCardProps {
  vm: ProgressionRowVM[] | EmptyVM;
  actions: Pick<ProgressActions, "openChart">;
}

/** Every exercise with history: trend, personal best and gain since the first session. */
export function ProgressionCard({ vm, actions }: ProgressionCardProps): JSX.Element {
  const empty = isEmpty(vm);
  return (
    <Card
      title="Progression & records"
      subtitle={`Trend & personal best${empty ? "" : " · click a row for full history"}`}
    >
      {empty ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <Stack gap="sm">
          <Grid columns={PROGRESSION_COLUMNS} gap="lg" paddingX="xxs">
            <Text variant="eyebrow">Exercise</Text>
            <Text variant="eyebrow">Trend</Text>
            <Text variant="eyebrow" align="end">
              Best
            </Text>
            <Text variant="eyebrow">Gain</Text>
          </Grid>
          <div>
            {vm.map((row) => (
              <ProgressionRow key={row.exId} vm={row} actions={actions} />
            ))}
          </div>
        </Stack>
      )}
    </Card>
  );
}
