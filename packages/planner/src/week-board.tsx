import type { Schedule } from "@nabd/domain";
import { DAYS_PER_WEEK } from "@nabd/domain";
import { Grid } from "@nabd/design-system";
import type { GridColumns } from "@nabd/design-system";
import { AddCard } from "./add-card";
import type { BoardVM } from "./board-vm";
import { DayCard } from "./day-card";
import type { PlannerActions } from "./planner-actions";
import { RestCard } from "./rest-card";

interface WeekBoardProps {
  vm: BoardVM;
  actions: Pick<PlannerActions, "edit" | "selectDay">;
}

/** A column per weekday for a week; as many tiles as fit for a floating plan. */
const COLUMNS: Record<Schedule, GridColumns> = {
  weekday: DAYS_PER_WEEK,
  floating: { atLeast: "tile" },
};

/** The plan at a glance: one tile per day (or free weekday), the selected one ringed. */
export function WeekBoard({ vm, actions }: WeekBoardProps): JSX.Element {
  return (
    // Every tile of a row is as tall as the tallest, and never squat.
    <Grid
      role="group"
      ariaLabel="Days"
      columns={COLUMNS[vm.schedule]}
      rows={{ min: "tile" }}
      gap="sm"
    >
      {vm.columns.map((column) => {
        switch (column.kind) {
          case "day":
            return <DayCard key={column.dayId} vm={column} actions={actions} />;
          case "rest":
            return <RestCard key={column.weekday} vm={column} actions={actions} />;
          case "add":
            return <AddCard key="add" actions={actions} />;
        }
      })}
    </Grid>
  );
}
