import { Grid, Page } from "@nabd/design-system";
import { CoverageRail } from "./coverage-rail";
import { DayEditor } from "./day-editor";
import type { PlannerActions } from "./planner-actions";
import type { PlannerVM } from "./planner-vm";
import { ProgramHeader } from "./program-header";
import { WeekBoard } from "./week-board";

interface PlannerScreenProps {
  vm: PlannerVM;
  actions: PlannerActions;
}

/** The editor takes what the coverage rail's fixed width leaves. */
const COLUMNS = "minmax(0, 1fr) 300px";

/** The Plan screen: program header, week board, and the selected day beside the coverage rail. */
export function PlannerScreen({ vm, actions }: PlannerScreenProps): JSX.Element {
  return (
    <Page width="wide">
      <ProgramHeader vm={vm.header} actions={actions} />
      <WeekBoard vm={vm.board} actions={actions} />
      {vm.editor && (
        <Grid columns={COLUMNS} gap="lg" align="start">
          <DayEditor vm={vm.editor} actions={actions} />
          <CoverageRail vm={vm.rail} />
        </Grid>
      )}
    </Page>
  );
}
