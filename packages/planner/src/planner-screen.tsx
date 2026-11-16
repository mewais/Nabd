import { Page } from "@nabd/design-system";
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

/** The Plan screen: program header, week board, and the selected day beside the coverage rail. */
export function PlannerScreen({ vm, actions }: PlannerScreenProps): JSX.Element {
  return (
    <Page maxWidth={1320}>
      <ProgramHeader vm={vm.header} actions={actions} />
      <WeekBoard vm={vm.board} actions={actions} />
      {vm.editor && (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
          <DayEditor vm={vm.editor} actions={actions} />
          <CoverageRail vm={vm.rail} />
        </div>
      )}
    </Page>
  );
}
