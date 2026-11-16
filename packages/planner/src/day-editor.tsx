import { Button, Card, TEXT, TitleInput } from "@nabd/design-system";
import { DayPlacement } from "./day-placement";
import type { EditorRowVM, EditorVM } from "./editor-vm";
import { ExerciseCard } from "./exercise-card";
import { MusclePicker } from "./muscle-picker";
import type { PlannerActions } from "./planner-actions";
import { SlotCard } from "./slot-card";
import { SupersetGroup } from "./superset-group";

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
  return (
    <Card ariaLabel="Day editor" padding={0} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <TitleInput
          size="md"
          width={160}
          ariaLabel="Day name"
          value={vm.name}
          onChange={(name) => actions.edit((e) => e.renameDay(dayId, name))}
        />
        <DayPlacement vm={vm.placement} dayId={dayId} actions={actions} />
        <span style={TEXT.cardSubtitle}>{vm.summary}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => actions.removeDay(dayId)}
          style={{ marginLeft: "auto" }}
        >
          Delete day
        </Button>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
        {vm.rows.map(row)}
        {vm.type === "fixed" ? (
          <Button
            variant="ghost"
            size="md"
            tone="accent"
            dashed
            block
            onClick={() => actions.addExercise(dayId)}
          >
            + Add exercise
          </Button>
        ) : (
          <MusclePicker onPick={(muscle) => actions.edit((e) => e.addSlot(dayId, muscle))} />
        )}
      </div>
    </Card>
  );
}
