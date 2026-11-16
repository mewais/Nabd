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

/** The coverage rail's width beside the editor. */
const RAIL_WIDTH = 300;
/**
 * The narrowest the editor may get beside the rail: what a set table with a
 * rep range and an intensity column needs. With less room (a window near its
 * smallest) the rail goes under the editor.
 */
const EDITOR_MIN_WIDTH = 480;

/** The Plan screen: program header, week board, and the selected day beside the coverage rail. */
export function PlannerScreen({ vm, actions }: PlannerScreenProps): JSX.Element {
  return (
    <Page width="wide">
      <ProgramHeader vm={vm.header} actions={actions} />
      <WeekBoard vm={vm.board} actions={actions} />
      {vm.editor && (
        <WithSide
          side={<CoverageRail vm={vm.rail} />}
          sideWidth={RAIL_WIDTH}
          mainMinWidth={EDITOR_MIN_WIDTH}
          gap="lg"
        >
          <DayEditor vm={vm.editor} actions={actions} />
        </WithSide>
      )}
    </Page>
  );
}
