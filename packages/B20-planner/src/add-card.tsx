import { CardButton, Icon, TEXT } from "@nabd/design-system";

export interface AddCardProps {
  onAdd: () => void;
}

/** The tile at the end of a floating plan that appends a day. */
export function AddCard({ onAdd }: AddCardProps): JSX.Element {
  return (
    <CardButton
      dashed
      onClick={onAdd}
      style={{ minHeight: 150, alignItems: "center", justifyContent: "center", gap: 6 }}
    >
      <Icon name="plus" size={22} />
      <span style={TEXT.label}>Add day</span>
    </CardButton>
  );
}
