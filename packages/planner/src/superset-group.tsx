import { Card, Row, Stack, Text } from "@nabd/design-system";
import type { SupersetVM } from "./editor-vm";
import { ExerciseCard } from "./exercise-card";
import type { PlannerActions } from "./planner-actions";

interface SupersetGroupProps {
  vm: SupersetVM;
  dayId: string;
  actions: Pick<PlannerActions, "edit">;
}

/**
 * Exercises done back to back, framed together — and kept together: the hint
 * says how moving a member behaves (the rule is ProgramEditor.moveExercise's).
 */
export function SupersetGroup({ vm, dayId, actions }: SupersetGroupProps): JSX.Element {
  return (
    <Card variant="frame" tone="success" padding="md">
      <Stack gap="sm">
        <Row gap="sm" align="baseline" paddingX="xs">
          <Text variant="eyebrow" tone="success">
            Superset
          </Text>
          <Text variant="hint">Moves as one. Move an exercise past its edge to unlink it.</Text>
        </Row>
        {vm.members.map((member) => (
          <ExerciseCard key={member.id} vm={member} dayId={dayId} actions={actions} />
        ))}
      </Stack>
    </Card>
  );
}
