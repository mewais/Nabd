import { Grid, Page, Row, Stack, StatTile } from "@nabd/design-system";
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

/** Today: the next set and the day's queue on the left, the week's coverage in a narrower column on the right. */
export function TodayScreen({ vm, actions }: TodayScreenProps): JSX.Element {
  return (
    <Page>
      <Grid columns={[1.55, 1]} gap="xl" align="start">
        <Stack gap="xl">
          {vm.hero.kind === "next" ? (
            <NextSetCard vm={vm.hero} actions={actions} />
          ) : (
            <HeroNotice vm={vm.hero} actions={actions} />
          )}
          {vm.emptySlotsNote !== null && <PlanNote text={vm.emptySlotsNote} />}
          {vm.queue.rows.length > 0 && <QueueCard vm={vm.queue} actions={actions} />}
        </Stack>
        <Stack gap="xl">
          <CoverageCard vm={vm.coverage} actions={actions} />
          <InsightCard vm={vm.insight} />
          <Row gap="md" align="stretch">
            {vm.stats.map((stat) => (
              <StatTile key={stat.label} {...stat} />
            ))}
          </Row>
        </Stack>
      </Grid>
    </Page>
  );
}
