import { Card, EmptyNote, Grid, Stack, Text } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { ProgressActions } from "./progress-actions";
import type { ProgressionVM } from "./progress-vm";
import { PROGRESSION_COLUMNS, ProgressionRow } from "./progression-row";
import { WORDS } from "./wording";

interface ProgressionCardProps {
  vm: ProgressionVM;
  actions: Pick<ProgressActions, "openChart">;
}

/** Every exercise with history: trend, personal best and gain since the first session. */
export function ProgressionCard({ vm, actions }: ProgressionCardProps): JSX.Element {
  const { rows } = vm;
  return (
    <Card title={WORDS.progression} subtitle={vm.subtitle}>
      {isEmpty(rows) ? (
        <EmptyNote>{rows.empty}</EmptyNote>
      ) : (
        <Stack gap="sm">
          <Grid columns={PROGRESSION_COLUMNS} gap="lg" paddingX="xxs">
            <Text variant="eyebrow">{WORDS.exercise}</Text>
            <Text variant="eyebrow">{WORDS.trend}</Text>
            <Text variant="eyebrow" align="end">
              {WORDS.best}
            </Text>
            <Text variant="eyebrow">{WORDS.gain}</Text>
          </Grid>
          <div>
            {rows.map((row) => (
              <ProgressionRow key={row.exId} vm={row} actions={actions} />
            ))}
          </div>
        </Stack>
      )}
    </Card>
  );
}
