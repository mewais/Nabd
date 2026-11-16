import { Button, Icon, Stack, Text } from "@nabd/design-system";
import type { PlannerActions } from "./planner-actions";
import { WORDS } from "./wording";

interface AddCardProps {
  actions: Pick<PlannerActions, "edit">;
}

/** The tile at the end of a floating plan that appends a day. */
export function AddCard({ actions }: AddCardProps): JSX.Element {
  return (
    <Button variant="add" onClick={() => actions.edit((e) => e.addDay(null))}>
      <Stack as="span" align="center" gap="sm">
        <Icon name="plus" size="xl" />
        <Text as="span" variant="label">
          {WORDS.addDay}
        </Text>
      </Stack>
    </Button>
  );
}
