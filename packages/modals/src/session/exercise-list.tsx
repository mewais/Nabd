import { Button, Eyebrow } from "@nabd/design-system";
import { ExerciseRow } from "./exercise-row";
import type { SessionListRowVM } from "./session-vm";

interface ExerciseListProps {
  rows: SessionListRowVM[];
  onPick: (itemId: string) => void;
  onLogOther: () => void;
}

/** The logger's left pane: today's exercises, and a way to log one that is not planned. */
export function ExerciseList({ rows, onPick, onLogOther }: ExerciseListProps): JSX.Element {
  return (
    <nav
      aria-label="Today's exercises"
      style={{
        width: 248,
        flexShrink: 0,
        boxSizing: "border-box",
        borderRight: "1px solid var(--line)",
        padding: "16px 14px",
        overflowY: "auto",
      }}
    >
      <Eyebrow style={{ marginBottom: 10, padding: "0 4px" }}>{"Today's exercises"}</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {rows.map((row) => (
          <ExerciseRow key={row.itemId} row={row} onPick={onPick} />
        ))}
      </div>
      <Button variant="ghost" size="sm" dashed block onClick={onLogOther} style={{ marginTop: 10 }}>
        + Something else
      </Button>
    </nav>
  );
}
