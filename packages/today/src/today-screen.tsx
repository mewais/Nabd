import type { CSSProperties } from "react";
import { Page, StatTile } from "@nabd/design-system";
import { CoverageCard } from "./coverage-card";
import { HeroNotice } from "./hero-notice";
import { InsightCard } from "./insight-card";
import { NextSetCard } from "./next-set-card";
import { PlanNote } from "./plan-note";
import { QueueCard } from "./queue-card";
import type { TodayActions } from "./today-actions";
import type { TodayVM } from "./today-vm";

interface TodayScreenProps {
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
          {vm.hero.kind === "next" ? (
            <NextSetCard vm={vm.hero} actions={actions} />
          ) : (
            <HeroNotice vm={vm.hero} actions={actions} />
          )}
          {vm.emptySlotsNote !== null && <PlanNote text={vm.emptySlotsNote} />}
          {vm.queue.rows.length > 0 && <QueueCard vm={vm.queue} actions={actions} />}
        </div>
        <div style={COLUMN}>
          <CoverageCard vm={vm.coverage} actions={actions} />
          <InsightCard vm={vm.insight} />
          <div style={{ display: "flex", gap: 12 }}>
            {vm.stats.map((stat) => (
              <StatTile key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
