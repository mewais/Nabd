import { CardButton, Icon, TEXT } from "@nabd/design-system";
import type { PlannerActions } from "./planner-actions";

interface AddCardProps {
  actions: Pick<PlannerActions, "edit">;
}

/** The tile at the end of a floating plan that appends a day. */
export function AddCard({ actions }: AddCardProps): JSX.Element {
  return (
    <CardButton
      dashed
      onClick={() => actions.edit((e) => e.addDay(null))}
      style={{ minHeight: 150, alignItems: "center", justifyContent: "center", gap: 6 }}
    >
      <Icon name="plus" size={22} />
      <span style={TEXT.label}>Add day</span>
    </CardButton>
  );
}
