import type { CSSProperties } from "react";
import { Page, TEXT } from "@nabd/design-system";
import { CompletionCard } from "./completion-card";
import { ConsistencyCard } from "./consistency-card";
import { HeatmapCard } from "./heatmap-card";
import { KpiStrip } from "./kpi-strip";
import { ProgressionCard } from "./progression-card";
import { TimeOfDayCard } from "./time-of-day-card";
import { TriggerCard } from "./trigger-card";
import type { ConsistencyTab, ProgressActions, ProgressVM } from "./view-model";

export interface ProgressScreenProps {
  vm: ProgressVM;
  /** Which view of the consistency card is showing. */
  tab: ConsistencyTab;
  actions: ProgressActions;
}

/** Two cards side by side, as tall as each other. */
function pair(columns: string): CSSProperties {
  return { display: "grid", gridTemplateColumns: columns, gap: 16, alignItems: "stretch" };
}

export function ProgressScreen({ vm, tab, actions }: ProgressScreenProps): JSX.Element {
  return (
    <Page maxWidth={1100}>
      <h1 style={{ ...TEXT.title, margin: 0 }}>Progress</h1>
      <KpiStrip kpis={vm.kpis} />
      <div style={pair("minmax(0, 1.5fr) minmax(0, 1fr)")}>
        <ConsistencyCard consistency={vm.consistency} tab={tab} onTab={actions.setProgressTab} />
        <CompletionCard completion={vm.completion} />
      </div>
      <div style={pair("minmax(0, 1fr) minmax(0, 1fr)")}>
        <TimeOfDayCard timeOfDay={vm.timeOfDay} />
        <TriggerCard triggers={vm.triggers} />
      </div>
      <HeatmapCard heatmap={vm.heatmap} />
      <ProgressionCard progression={vm.progression} onOpenChart={actions.setChartExercise} />
    </Page>
  );
}
