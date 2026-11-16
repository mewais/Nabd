import { Button, Chip } from "@nabd/design-system";
import type { PoolEntryVM } from "./editor-vm";

interface PoolChipsProps {
  vm: PoolEntryVM[];
  onRemove: (exId: string) => void;
  onAdd: () => void;
}

/** The exercises a slot rotates through, each removable, and a way to add one. */
export function PoolChips({ vm, onRemove, onAdd }: PoolChipsProps): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
      {vm.map((entry) => (
        <Chip
          key={entry.id}
          variant="box"
          onRemove={() => onRemove(entry.id)}
          removeLabel={`Remove ${entry.name} from pool`}
        >
          {entry.name}
        </Chip>
      ))}
      <Button variant="ghost" size="sm" tone="accent" dashed onClick={onAdd}>
        + Add exercise
      </Button>
    </div>
  );
}
