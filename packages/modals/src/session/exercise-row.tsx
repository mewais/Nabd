import { CheckMark, Row, RowButton, Text, TitleBlock } from "@nabd/design-system";
import type { SessionActions } from "./session-actions";
import type { SessionListRowVM } from "./session-vm";

interface ExerciseRowProps {
  vm: SessionListRowVM;
  actions: Pick<SessionActions, "focusItem">;
}

/** One of today's exercises in the logger's list; pressing it switches the form to it. */
export function ExerciseRow({ vm, actions }: ExerciseRowProps): JSX.Element {
  return (
    <RowButton
      variant="nav"
      current={vm.active}
      dimmed={vm.skipped}
      onClick={() => actions.focusItem(vm.itemId)}
    >
      <Row as="span" gap="sm">
        <CheckMark checked={vm.complete} label={vm.complete ? "complete" : undefined} />
        <TitleBlock
          size="dense"
          title={vm.exercise}
          subtitle={vm.detail}
          tone={vm.active ? "accent" : "strong"}
          truncate
          inline
          grow
        />
        <Text as="span" variant="monoCaption" tone={vm.complete ? "success" : "faint"}>
          {vm.progress}
        </Text>
      </Row>
    </RowButton>
  );
}
