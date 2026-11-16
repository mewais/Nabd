import { Button, ModalShell, TEXT } from "@nabd/design-system";
import { ExerciseList } from "./exercise-list";
import type { SessionActions } from "./session-actions";
import type { SessionVM } from "./session-vm";
import { SetForm } from "./set-form";

export interface SessionModalProps {
  vm: SessionVM;
  actions: SessionActions;
}

/** The logger: today's exercises on the left, one set at a time on the right. */
export function SessionModal({ vm, actions }: SessionModalProps): JSX.Element {
  return (
    <ModalShell
      eyebrow="Log sets"
      title="This break"
      subtitle="One set, or as many as you have time for — switch exercises freely."
      onClose={actions.close}
      width={720}
    >
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <ExerciseList rows={vm.list} onPick={actions.focusItem} onLogOther={actions.logOther} />
        <SetForm form={vm.form} actions={actions} />
      </div>
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          padding: "14px 22px",
          borderTop: "1px solid var(--line)",
        }}
      >
        <span style={TEXT.hint}>{vm.footer}</span>
        <Button tone="success" onClick={actions.close}>
          Done
        </Button>
      </footer>
    </ModalShell>
  );
}
