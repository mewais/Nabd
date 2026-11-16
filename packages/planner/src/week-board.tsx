import type { CSSProperties } from "react";
import type { Schedule } from "@nabd/domain";
import { AddCard } from "./add-card";
import type { BoardVM } from "./board-vm";
import { DayCard } from "./day-card";
import type { PlannerActions } from "./planner-actions";
import { RestCard } from "./rest-card";

interface WeekBoardProps {
  vm: BoardVM;
  actions: Pick<PlannerActions, "edit" | "selectDay">;
}

/** Seven equal columns for a week; as many tiles as fit for a floating plan. */
const GRID_COLUMNS: Record<Schedule, CSSProperties["gridTemplateColumns"]> = {
  weekday: "repeat(7,minmax(0,1fr))",
  floating: "repeat(auto-fill,minmax(150px,1fr))",
};

/** The plan at a glance: one tile per day (or free weekday), the selected one ringed. */
export function WeekBoard({ vm, actions }: WeekBoardProps): JSX.Element {
  return (
    <div style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS[vm.schedule], gap: 10 }}>
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
    </div>
  );
}
