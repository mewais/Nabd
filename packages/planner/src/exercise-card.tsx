import { Card, Chip, IconButton, Row, Stack, Text, TitleBlock } from "@nabd/design-system";
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
    <Card variant="tile" padding="lg" ariaLabel={vm.name}>
      <Stack gap="md">
        <Row gap="sm" align="start">
          {vm.supersetTag !== null && (
            <Text as="span" variant="monoValue" tone="success">
              {vm.supersetTag}
            </Text>
          )}
          <TitleBlock title={vm.name} subtitle={vm.muscles} grow />
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
        </Row>
        <SetTable
          vm={vm.block}
          onEdit={(change) =>
            edit((e) => e.editPrescription(dayId, { kind: "exercise", id: rowId }, change))
          }
        />
        <Row>
          <SupersetToggle
            linked={vm.supersetTag !== null}
            onToggle={() => edit((e) => e.toggleSuperset(dayId, rowId))}
          />
        </Row>
      </Stack>
    </Card>
  );
}
