import { Card, Chip, FONT, IconButton, TEXT } from "@nabd/design-system";
import type { ExerciseCardVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import type { PlannerActions } from "./planner-actions";
import { SetTable } from "./set-table";
import { SupersetToggle } from "./superset-toggle";

interface ExerciseCardProps {
  vm: ExerciseCardVM;
  dayId: string;
  actions: Pick<PlannerActions, "edit">;
}

/** One exercise of a fixed day: what it is, its set table, and its superset link. */
export function ExerciseCard({ vm, dayId, actions }: ExerciseCardProps): JSX.Element {
  const { edit } = actions;
  const rowId = vm.id;
  return (
    <section aria-label={vm.name}>
      <Card variant="tile" padding={14}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {vm.supersetTag !== null && (
            <span
              style={{
                fontFamily: FONT.mono,
                fontWeight: 700,
                fontSize: 12,
                color: "var(--accent2)",
              }}
            >
              {vm.supersetTag}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={TEXT.cardTitle}>{vm.name}</div>
            <div style={{ ...TEXT.cardSubtitle, marginTop: 3 }}>{vm.muscles}</div>
          </div>
          {vm.equipment !== "" && <Chip variant="tag">{vm.equipment}</Chip>}
          <MoveButtons
            onMove={(direction) => edit((e) => e.moveExercise(dayId, rowId, direction))}
          />
          <IconButton
            icon="close"
            variant="plain"
            ariaLabel="Remove exercise"
            onClick={() => edit((e) => e.removeExercise(dayId, rowId))}
          />
        </div>
        <SetTable
          vm={vm.block}
          onEdit={(change) =>
            edit((e) => e.editPrescription(dayId, { kind: "exercise", id: rowId }, change))
          }
        />
        <div style={{ marginTop: 10 }}>
          <SupersetToggle
            linked={vm.supersetTag !== null}
            onToggle={() => edit((e) => e.toggleSuperset(dayId, rowId))}
          />
        </div>
      </Card>
    </section>
  );
}
