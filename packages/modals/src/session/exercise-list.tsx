import { Button, ScrollArea, Stack, Text } from "@nabd/design-system";
import { ExerciseRow } from "./exercise-row";
import type { SessionActions } from "./session-actions";
import type { SessionListRowVM } from "./session-vm";
import { WORDS } from "../wording";

interface ExerciseListProps {
  vm: SessionListRowVM[];
  actions: Pick<SessionActions, "focusItem" | "logOther">;
}

/** The logger's left pane: today's exercises, and a way to log one that is not planned. */
export function ExerciseList({ vm, actions }: ExerciseListProps): JSX.Element {
  return (
    <ScrollArea as="nav" ariaLabel={WORDS.todaysExercises} edge="right" paddingX="md" paddingY="lg">
      <Stack gap="sm">
        <Stack paddingX="sm">
          <Text variant="eyebrow">{WORDS.todaysExercises}</Text>
        </Stack>
        <Stack gap="xxs">
          {vm.map((row) => (
            <ExerciseRow key={row.itemId} vm={row} actions={actions} />
          ))}
        </Stack>
        <Button variant="add" size="sm" block onClick={actions.logOther}>
          {WORDS.somethingElse}
        </Button>
      </Stack>
    </ScrollArea>
  );
}
