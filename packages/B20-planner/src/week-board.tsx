import type { CSSProperties } from "react";
import type { Schedule } from "@nabd/domain";
import { AddCard } from "./add-card";
import type { BoardVM } from "./board-vm";
import { DayCard } from "./day-card";
import { RestCard } from "./rest-card";
import { useProgramActions } from "./use-actions";

export interface WeekBoardProps {
  board: BoardVM;
}

/** Seven equal columns for a week; as many tiles as fit for a floating plan. */
const GRID_COLUMNS: Record<Schedule, CSSProperties["gridTemplateColumns"]> = {
  weekday: "repeat(7,minmax(0,1fr))",
  floating: "repeat(auto-fill,minmax(150px,1fr))",
};

/** The plan at a glance: one tile per day (or free weekday), the edited one ringed. */
export function WeekBoard({ board }: WeekBoardProps): JSX.Element {
  const actions = useProgramActions();
  return (
    <div style={{ display: "grid", gridTemplateColumns: GRID_COLUMNS[board.schedule], gap: 10 }}>
      {board.columns.map((column) => {
        switch (column.kind) {
          case "day":
            return <DayCard key={column.dayId} day={column} onSelect={actions.selectDay} />;
          case "rest":
            return (
              <RestCard
                key={column.weekday}
                label={column.label}
                onAddDay={() => actions.addDay(column.weekday)}
              />
            );
          case "add":
            return <AddCard key="add" onAdd={() => actions.addDay(null)} />;
        }
      })}
    </div>
  );
}
