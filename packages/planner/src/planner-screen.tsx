import { Page } from "@nabd/design-system";
import type { PlannerActions } from "./actions";
import { CoverageRail } from "./coverage-rail";
import { DayEditor } from "./day-editor";
import { ProgramHeader } from "./program-header";
import { PlannerActionsProvider } from "./use-actions";
import type { PlannerVM } from "./view-model";
import { WeekBoard } from "./week-board";

export interface PlannerScreenProps {
  vm: PlannerVM;
  actions: PlannerActions;
}

/** The Plan screen: program header, week board, and the selected day beside the coverage rail. */
export function PlannerScreen({ vm, actions }: PlannerScreenProps): JSX.Element {
  return (
    <PlannerActionsProvider value={actions}>
      <Page maxWidth={1320}>
        <ProgramHeader header={vm.header} />
        <WeekBoard board={vm.board} />
        {vm.editor && (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <DayEditor editor={vm.editor} />
            <CoverageRail rail={vm.rail} />
          </div>
        )}
      </Page>
    </PlannerActionsProvider>
  );
}
