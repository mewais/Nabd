import { Chip } from "@nabd/design-system";
import type { DayPlacementVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import type { PlannerActions } from "./planner-actions";
import { WeekdayPicker } from "./weekday-picker";

interface DayPlacementProps {
  vm: DayPlacementVM;
  dayId: string;
  actions: Pick<PlannerActions, "edit">;
}

/** Where a day sits in the plan, and the control that moves it. */
export function DayPlacement({ vm, dayId, actions }: DayPlacementProps): JSX.Element {
  if (vm.kind === "weekday") {
    return (
      <WeekdayPicker
        weekday={vm.weekday}
        onPick={(weekday) => actions.edit((e) => e.setWeekday(dayId, weekday))}
      />
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Chip variant="tag">{vm.label}</Chip>
      <MoveButtons
        horizontal
        onMove={(direction) => actions.edit((e) => e.moveDay(dayId, direction))}
      />
    </div>
  );
}
