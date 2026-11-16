import type { EditorRow } from "./editor-vm";
import { ExerciseCard } from "./exercise-card";
import { SlotCard } from "./slot-card";
import { SupersetGroup } from "./superset-group";

export interface EditorRowsProps {
  dayId: string;
  rows: EditorRow[];
}

/** A day's content: exercise cards and superset groups (fixed), or slot cards (cycled). */
export function EditorRows({ dayId, rows }: EditorRowsProps): JSX.Element {
  return (
    <>
      {rows.map((row) => {
        switch (row.kind) {
          case "exercise":
            return <ExerciseCard key={row.id} dayId={dayId} exercise={row.exercise} />;
          case "superset":
            return <SupersetGroup key={row.id} dayId={dayId} members={row.members} />;
          case "slot":
            return <SlotCard key={row.id} dayId={dayId} slot={row.slot} />;
        }
      })}
    </>
  );
}
