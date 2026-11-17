import {
  Button,
  COMMON_WORDS,
  Card,
  Row,
  Spacer,
  Stack,
  Text,
  TitleInput,
} from "@nabd/design-system";
import { DayPlacement } from "./day-placement";
import type { EditorRowVM, EditorVM } from "./editor-vm";
import { ExerciseCard } from "./exercise-card";
import { MusclePicker } from "./muscle-picker";
import type { PlannerActions } from "./planner-actions";
import { SlotCard } from "./slot-card";
import { SupersetGroup } from "./superset-group";
import { WORDS } from "./wording";

interface DayEditorProps {
  vm: EditorVM;
  actions: PlannerActions;
}

/** The selected day: its name and placement, its exercises or slots, and what can be added. */
export function DayEditor({ vm, actions }: DayEditorProps): JSX.Element {
  const { dayId } = vm;
  const row = (rowVM: EditorRowVM): JSX.Element => {
    switch (rowVM.kind) {
      case "exercise":
        return <ExerciseCard key={rowVM.id} vm={rowVM.exercise} dayId={dayId} actions={actions} />;
      case "superset":
        return <SupersetGroup key={rowVM.id} vm={rowVM.superset} dayId={dayId} actions={actions} />;
      case "slot":
        return <SlotCard key={rowVM.id} vm={rowVM.slot} dayId={dayId} actions={actions} />;
    }
  };
  const header = (
    <Row gap="lg" wrap>
      <TitleInput
        size="md"
        ariaLabel={WORDS.dayName}
        value={vm.name}
        onChange={(name) => actions.edit((e) => e.renameDay(dayId, name))}
      />
      <DayPlacement vm={vm.placement} dayId={dayId} actions={actions} />
      <Text variant="caption">{vm.summary}</Text>
      <Spacer />
      <Button variant="ghost" size="sm" onClick={() => actions.removeDay(dayId)}>
        {COMMON_WORDS.deleteDay}
      </Button>
    </Row>
  );
  return (
    <Card ariaLabel={WORDS.dayEditor} header={header} padding="lg" flush divided grow>
      <Stack gap="md" padding="lg">
        {vm.rows.map(row)}
        {vm.type === "fixed" ? (
          <Button
            variant="add"
            size="md"
            tone="accent"
            block
            onClick={() => actions.addExercise(dayId)}
          >
            {WORDS.addExercise}
          </Button>
        ) : (
          <MusclePicker onPick={(muscle) => actions.edit((e) => e.addSlot(dayId, muscle))} />
        )}
      </Stack>
    </Card>
  );
}
