import type { CSSProperties } from "react";
import { Page } from "@nabd/design-system";
import type { TodayActions } from "./actions";
import { CoverageCard } from "./coverage-card";
import { HeroCard } from "./hero-card";
import { InsightCard } from "./insight-card";
import { PlanNote } from "./plan-note";
import { QueueCard } from "./queue-card";
import { StatTiles } from "./stat-tiles";
import type { TodayVM } from "./view-model";

export interface TodayScreenProps {
  vm: TodayVM;
  actions: TodayActions;
}

const COLUMNS: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)",
  gap: 20,
  alignItems: "start",
};

const COLUMN: CSSProperties = { display: "flex", flexDirection: "column", gap: 18, minWidth: 0 };

/** Today: the next set and the day's queue on the left, the week's coverage on the right. */
export function TodayScreen({ vm, actions }: TodayScreenProps): JSX.Element {
  return (
    <Page>
      <div style={COLUMNS}>
        <div style={COLUMN}>
          <HeroCard
            vm={vm.hero}
            onStart={() => actions.start()}
            onSnooze={actions.snooze}
            onLogOther={actions.logOther}
          />
          {vm.emptySlotsNote !== null && <PlanNote text={vm.emptySlotsNote} />}
          {vm.queue.length > 0 && (
            <QueueCard
              dayName={vm.dayName}
              rows={vm.queue}
              onStart={actions.start}
              onToggleSkip={actions.toggleSkip}
            />
          )}
        </div>
        <div style={COLUMN}>
          <CoverageCard
            vm={vm.coverage}
            onMapView={actions.setMapView}
            onMapStyle={actions.setMapStyle}
          />
          <InsightCard rows={vm.insight} />
          <StatTiles tiles={vm.stats} />
        </div>
      </div>
    </Page>
  );
}
