import { Button, Icon } from "@nabd/design-system";

interface SupersetToggleProps {
  /** The exercise is in a superset: the toggle dissolves it instead of linking. */
  linked: boolean;
  onToggle: () => void;
}

/** Links an exercise with the one below it, or unlinks a superset. */
export function SupersetToggle({ linked, onToggle }: SupersetToggleProps): JSX.Element {
  return linked ? (
    <Button variant="link" size="sm" tone="neutral" onClick={onToggle}>
      Unlink
    </Button>
  ) : (
    <Button variant="link" size="sm" tone="success" onClick={onToggle}>
      <Icon name="link" size={13} />
      Superset ↓
    </Button>
  );
}
