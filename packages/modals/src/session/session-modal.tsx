import { Button, Grid, ModalShell, Text } from "@nabd/design-system";
import { ExerciseList } from "./exercise-list";
import type { SessionActions } from "./session-actions";
import type { SessionVM } from "./session-vm";
import { SetForm } from "./set-form";
import { WORDS } from "../wording";

interface SessionModalProps {
  vm: SessionVM;
  actions: SessionActions;
}

/** The logger: today's exercises on the left, one set at a time on the right. */
export function SessionModal({ vm, actions }: SessionModalProps): JSX.Element {
  const footer = (
    <>
      <Text variant="hint">{vm.footer}</Text>
      <Button tone="success" onClick={actions.close}>
        {WORDS.done}
      </Button>
    </>
  );
  return (
    <ModalShell
      eyebrow={WORDS.logSets}
      title={WORDS.thisBreak}
      subtitle={vm.subtitle}
      onClose={actions.close}
      width="lg"
      footer={footer}
    >
      {/* One row as tall as the dialog allows: each pane scrolls on its own. */}
      <Grid columns={["sidebar", 1]} rows="fill" grow>
        <ExerciseList vm={vm.list} actions={actions} />
        <SetForm vm={vm.form} actions={actions} />
      </Grid>
    </ModalShell>
  );
}
