import { Card, Chip, FONT, IconButton, RADIUS, TEXT } from "@nabd/design-system";
import type { ExerciseCardVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import { SetTable } from "./set-table";
import { SupersetToggle } from "./superset-toggle";
import { useExerciseActions, usePrescriptionActions } from "./use-actions";

export interface ExerciseCardProps {
  dayId: string;
  exercise: ExerciseCardVM;
}

/** One exercise of a fixed day: what it is, its set table, and its superset link. */
export function ExerciseCard({ dayId, exercise }: ExerciseCardProps): JSX.Element {
  const actions = useExerciseActions(dayId, exercise.id);
  const prescription = usePrescriptionActions(dayId, "ex", exercise.id);
  return (
    <Card padding={14} style={{ borderRadius: RADIUS.tile }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {exercise.supersetTag !== null && (
          <span
            style={{
              fontFamily: FONT.mono,
              fontWeight: 700,
              fontSize: 12,
              color: "var(--accent2)",
            }}
          >
            {exercise.supersetTag}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={TEXT.cardTitle}>{exercise.name}</div>
          <div style={{ ...TEXT.cardSubtitle, marginTop: 3 }}>{exercise.muscles}</div>
        </div>
        {exercise.equipment !== "" && <Chip variant="tag">{exercise.equipment}</Chip>}
        <MoveButtons onMove={actions.move} />
        <IconButton icon="close" variant="plain" label="Remove exercise" onClick={actions.remove} />
      </div>
      <SetTable block={exercise.block} actions={prescription} />
      <div style={{ marginTop: 10 }}>
        <SupersetToggle linked={exercise.supersetTag !== null} onToggle={actions.toggleSuperset} />
      </div>
    </Card>
  );
}
