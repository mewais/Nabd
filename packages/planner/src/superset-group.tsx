import { Eyebrow, RADIUS, TEXT, tint } from "@nabd/design-system";
import type { SupersetVM } from "./editor-vm";
import { ExerciseCard } from "./exercise-card";
import type { PlannerActions } from "./planner-actions";

interface SupersetGroupProps {
  vm: SupersetVM;
  dayId: string;
  actions: Pick<PlannerActions, "edit">;
}

const SUPERSET_COLOR = "var(--accent2)";

/**
 * Exercises done back to back, framed together — and kept together: the hint
 * says how moving a member behaves (the rule is ProgramEditor.moveExercise's).
 */
export function SupersetGroup({ vm, dayId, actions }: SupersetGroupProps): JSX.Element {
  return (
    <div
      style={{
        border: `2px solid ${SUPERSET_COLOR}`,
        borderRadius: RADIUS.card,
        padding: 11,
        background: tint(SUPERSET_COLOR, 6),
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, margin: "0 0 9px 4px" }}>
        <Eyebrow style={{ color: SUPERSET_COLOR }}>Superset</Eyebrow>
        <span style={TEXT.hint}>Moves as one. Move an exercise past its edge to unlink it.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {vm.members.map((member) => (
          <ExerciseCard key={member.id} vm={member} dayId={dayId} actions={actions} />
        ))}
      </div>
    </div>
  );
}
