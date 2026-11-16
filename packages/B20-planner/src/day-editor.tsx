import { Button, Card, TEXT, TitleInput } from "@nabd/design-system";
import { DayPlacement } from "./day-placement";
import { EditorRows } from "./editor-rows";
import type { EditorVM } from "./editor-vm";
import { MusclePicker } from "./muscle-picker";
import { useDayActions } from "./use-actions";

export interface DayEditorProps {
  editor: EditorVM;
}

/** The selected day: its name and placement, its exercises or slots, and what can be added. */
export function DayEditor({ editor }: DayEditorProps): JSX.Element {
  const actions = useDayActions(editor.dayId);
  return (
    <Card padding={0} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
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
          value={editor.name}
          onChange={actions.rename}
        />
        <DayPlacement placement={editor.placement} actions={actions} />
        <span style={TEXT.cardSubtitle}>{editor.summary}</span>
        <Button variant="ghost" size="sm" onClick={actions.remove} style={{ marginLeft: "auto" }}>
          Delete day
        </Button>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
        <EditorRows dayId={editor.dayId} rows={editor.rows} />
        {editor.type === "fixed" ? (
          <Button
            variant="ghost"
            size="md"
            tone="accent"
            dashed
            block
            onClick={actions.addExercise}
          >
            + Add exercise
          </Button>
        ) : (
          <MusclePicker onPick={actions.addSlot} />
        )}
      </div>
    </Card>
  );
}
