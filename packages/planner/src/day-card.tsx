import { CardButton, Chip, Eyebrow, TEXT } from "@nabd/design-system";
import type { DayColumnVM } from "./board-vm";
import type { PlannerActions } from "./planner-actions";

interface DayCardProps {
  vm: DayColumnVM;
  actions: Pick<PlannerActions, "selectDay">;
}

/** A training day on the board: pick it to edit it. */
export function DayCard({ vm, actions }: DayCardProps): JSX.Element {
  return (
    <CardButton
      selected={vm.selected}
      onClick={() => actions.selectDay(vm.dayId)}
      style={{ minHeight: 150 }}
    >
      <Eyebrow>{vm.label}</Eyebrow>
      <div style={{ ...TEXT.cardTitle, margin: "5px 0 8px" }}>{vm.name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {vm.chips.map((chip, index) => (
          <Chip key={index} variant="box" tone={chip.superset ? "success" : "neutral"}>
            {chip.name}
          </Chip>
        ))}
        {vm.overflow !== null && <span style={TEXT.cardSubtitle}>{vm.overflow}</span>}
      </div>
    </CardButton>
  );
}
