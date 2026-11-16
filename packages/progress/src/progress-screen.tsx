import type { CSSProperties } from "react";
import { Page, StatTile, TEXT } from "@nabd/design-system";
import type { ProgressActions } from "./actions";
import { CompletionCard } from "./completion-card";
import { ConsistencyCard } from "./consistency-card";
import { HeatmapCard } from "./heatmap-card";
import { ProgressionCard } from "./progression-card";
import { TimeOfDayCard } from "./time-of-day-card";
import { TriggerCard } from "./trigger-card";
import type { ProgressVM } from "./view-model";

export interface ProgressScreenProps {
  vm: ProgressVM;
  actions: ProgressActions;
}

/** Two cards side by side, as tall as each other. */
function pair(columns: string): CSSProperties {
  return { display: "grid", gridTemplateColumns: columns, gap: 16, alignItems: "stretch" };
}

/** Progress: the headline figures, then how regularly, when, why and how well sets get done. */
export function ProgressScreen({ vm, actions }: ProgressScreenProps): JSX.Element {
  return (
    <Page maxWidth={1100}>
      <h1 style={{ ...TEXT.title, margin: 0 }}>Progress</h1>
      <div style={{ display: "flex", gap: 14 }}>
        {vm.kpis.map((kpi) => (
          <StatTile key={kpi.label} {...kpi} />
        ))}
      </div>
      <div style={pair("minmax(0, 1.5fr) minmax(0, 1fr)")}>
        <ConsistencyCard consistency={vm.consistency} onTab={actions.setTab} />
        <CompletionCard completion={vm.completion} />
      </div>
      <div style={pair("minmax(0, 1fr) minmax(0, 1fr)")}>
        <TimeOfDayCard timeOfDay={vm.timeOfDay} />
        <TriggerCard triggers={vm.triggers} />
      </div>
      <HeatmapCard heatmap={vm.heatmap} />
      <ProgressionCard progression={vm.progression} onOpenChart={actions.openChart} />
    </Page>
  );
}
