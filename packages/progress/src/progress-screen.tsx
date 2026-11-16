import { Grid, Page, Row, SCREEN_NAMES, StatTile, Text } from "@nabd/design-system";
import { CompletionCard } from "./completion-card";
import { ConsistencyCard } from "./consistency-card";
import { HeatmapCard } from "./heatmap-card";
import type { ProgressActions } from "./progress-actions";
import type { ProgressVM } from "./progress-vm";
import { ProgressionCard } from "./progression-card";
import { TimeOfDayCard } from "./time-of-day-card";
import { TriggerCard } from "./trigger-card";

interface ProgressScreenProps {
  vm: ProgressVM;
  actions: ProgressActions;
}

/**
 * Progress: the headline figures, then how regularly, when, why and how well
 * sets get done, in pairs of cards as tall as each other.
 */
export function ProgressScreen({ vm, actions }: ProgressScreenProps): JSX.Element {
  return (
    <Page width="sm">
      <Text as="h1" variant="title">
        {SCREEN_NAMES.progress}
      </Text>
      <Row gap="lg" align="stretch">
        {vm.kpis.map((kpi) => (
          <StatTile key={kpi.label} {...kpi} />
        ))}
      </Row>
      <Grid columns={[1.5, 1]} gap="lg">
        <ConsistencyCard vm={vm.consistency} actions={actions} />
        <CompletionCard vm={vm.completion} />
      </Grid>
      <Grid columns={2} gap="lg">
        <TimeOfDayCard vm={vm.timeOfDay} />
        <TriggerCard vm={vm.triggers} />
      </Grid>
      <HeatmapCard vm={vm.heatmap} />
      <ProgressionCard vm={vm.progression} actions={actions} />
    </Page>
  );
}
