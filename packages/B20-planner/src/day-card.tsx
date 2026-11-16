import { CardButton, Chip, Eyebrow, LiveDot, TEXT } from "@nabd/design-system";
import type { DayColumnVM } from "./board-vm";

export interface DayCardProps {
  day: DayColumnVM;
  onSelect: (dayId: string) => void;
}

/** A training day on the board: pick it to edit it. */
export function DayCard({ day, onSelect }: DayCardProps): JSX.Element {
  return (
    <CardButton
      selected={day.editing}
      onClick={() => onSelect(day.dayId)}
      style={{ minHeight: 150 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>{day.label}</Eyebrow>
        {day.editing && <LiveDot active={false} />}
      </div>
      <div style={{ ...TEXT.cardTitle, margin: "5px 0 8px" }}>{day.name}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {day.chips.map((chip, index) => (
          <Chip key={index} variant="box" tone={chip.superset ? "success" : "neutral"}>
            {chip.name}
          </Chip>
        ))}
        {day.overflow !== null && <span style={TEXT.cardSubtitle}>{day.overflow}</span>}
      </div>
    </CardButton>
  );
}
