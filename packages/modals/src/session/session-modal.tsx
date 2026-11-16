import { Button, Grid, ModalShell, Text } from "@nabd/design-system";
import { ExerciseList } from "./exercise-list";
import type { SessionActions } from "./session-actions";
import type { SessionVM } from "./session-vm";
import { SetForm } from "./set-form";

interface SessionModalProps {
  vm: SessionVM;
  actions: SessionActions;
}

/** The exercise list's fixed width, then the form. */
const COLUMNS = "248px minmax(0, 1fr)";
/** One row as tall as the dialog allows: each pane scrolls on its own. */
const ROWS = "minmax(0, 1fr)";

/** The logger: today's exercises on the left, one set at a time on the right. */
export function SessionModal({ vm, actions }: SessionModalProps): JSX.Element {
  const footer = (
    <>
      <Text variant="hint">{vm.footer}</Text>
      <Button tone="success" onClick={actions.close}>
        Done
      </Button>
    </>
  );
  return (
    <ModalShell
      eyebrow="Log sets"
      title="This break"
      subtitle={vm.subtitle}
      onClose={actions.close}
      width={720}
      footer={footer}
    >
      <Grid columns={COLUMNS} rows={ROWS} grow>
        <ExerciseList vm={vm.list} actions={actions} />
        <SetForm vm={vm.form} actions={actions} />
      </Grid>
    </ModalShell>
  );
}
