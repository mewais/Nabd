import { Chip } from "@nabd/design-system";
import type { DayActions } from "./actions";
import type { DayPlacementVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import { WeekdayPicker } from "./weekday-picker";

export interface DayPlacementProps {
  placement: DayPlacementVM;
  actions: Pick<DayActions, "setWeekday" | "move">;
}

/** Where a day sits in the plan, and the control that moves it. */
export function DayPlacement({ placement, actions }: DayPlacementProps): JSX.Element {
  if (placement.kind === "weekday") {
    return <WeekdayPicker weekday={placement.weekday} onPick={actions.setWeekday} />;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Chip variant="tag">{placement.label}</Chip>
      <MoveButtons horizontal onMove={actions.move} />
    </div>
  );
}
