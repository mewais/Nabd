import { Page, WithSide } from "@nabd/design-system";
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

/**
 * The Plan screen: program header, week board, and the selected day beside the
 * coverage rail — or above it, where the window leaves the editor less room
 * than a set table with a rep range and an intensity column needs.
 */
export function PlannerScreen({ vm, actions }: PlannerScreenProps): JSX.Element {
  return (
    <Page width="lg">
      <ProgramHeader vm={vm.header} actions={actions} />
      <WeekBoard vm={vm.board} actions={actions} />
      {vm.editor && (
        <WithSide
          side={<CoverageRail vm={vm.rail} />}
          sideWidth="rail"
          mainMinWidth="editor"
          gap="lg"
        >
          <DayEditor vm={vm.editor} actions={actions} />
        </WithSide>
      )}
    </Page>
  );
}
