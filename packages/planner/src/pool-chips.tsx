import { Button, Chip, Row } from "@nabd/design-system";
import type { PoolEntryVM } from "./editor-vm";
import { WORDS } from "./wording";

interface PoolChipsProps {
  vm: PoolEntryVM[];
  onRemove: (exId: string) => void;
  onAdd: () => void;
}

/** The exercises a slot rotates through, each removable, and a way to add one. */
export function PoolChips({ vm, onRemove, onAdd }: PoolChipsProps): JSX.Element {
  return (
    <Row gap="sm" wrap>
      {vm.map((entry) => (
        <Chip
          key={entry.id}
          variant="entry"
          onRemove={() => onRemove(entry.id)}
          removeAriaLabel={entry.removeAriaLabel}
        >
          {entry.name}
        </Chip>
      ))}
      <Button variant="add" size="sm" tone="accent" onClick={onAdd}>
        {WORDS.addExercise}
      </Button>
    </Row>
  );
}
