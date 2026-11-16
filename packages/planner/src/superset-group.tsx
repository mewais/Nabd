import { Eyebrow, RADIUS, tint } from "@nabd/design-system";
import type { ExerciseCardVM } from "./editor-vm";
import { ExerciseCard } from "./exercise-card";

interface SupersetGroupProps {
  dayId: string;
  members: ExerciseCardVM[];
}

const SUPERSET_COLOR = "var(--accent2)";

/** Exercises done back to back, framed together. */
export function SupersetGroup({ dayId, members }: SupersetGroupProps): JSX.Element {
  return (
    <div
      style={{
        border: `2px solid ${SUPERSET_COLOR}`,
        borderRadius: RADIUS.card,
        padding: 11,
        background: tint(SUPERSET_COLOR, 6),
      }}
    >
      <Eyebrow style={{ color: SUPERSET_COLOR, margin: "0 0 9px 4px" }}>Superset</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {members.map((member) => (
          <ExerciseCard key={member.id} dayId={dayId} exercise={member} />
        ))}
      </div>
    </div>
  );
}
