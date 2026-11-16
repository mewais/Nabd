import { CardButton, Icon, Text } from "@nabd/design-system";
import type { PlannerActions } from "./planner-actions";

interface AddCardProps {
  actions: Pick<PlannerActions, "edit">;
}

/** The tile at the end of a floating plan that appends a day. */
export function AddCard({ actions }: AddCardProps): JSX.Element {
  return (
    <CardButton dashed onClick={() => actions.edit((e) => e.addDay(null))}>
      <Icon name="plus" size={22} />
      <Text as="span" variant="label">
        Add day
      </Text>
    </CardButton>
  );
}
