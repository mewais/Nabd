import { Card, Eyebrow, IconButton, RADIUS, TEXT } from "@nabd/design-system";
import type { SlotCardVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import { PoolChips } from "./pool-chips";
import { SetTable } from "./set-table";
import { usePrescriptionActions, useSlotActions } from "./use-actions";

export interface SlotCardProps {
  dayId: string;
  slot: SlotCardVM;
}

/** One muscle of a cycled day: its exercise pool and the prescription they share. */
export function SlotCard({ dayId, slot }: SlotCardProps): JSX.Element {
  const actions = useSlotActions(dayId, slot.id, slot.muscle);
  const prescription = usePrescriptionActions(dayId, "slot", slot.id);
  return (
    <Card padding={15} style={{ borderRadius: RADIUS.tile }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={TEXT.cardTitle}>{slot.muscleName}</div>
          <div style={{ ...TEXT.cardSubtitle, marginTop: 2 }}>{slot.hint}</div>
        </div>
        <MoveButtons onMove={actions.move} />
        <IconButton icon="close" variant="plain" label="Remove slot" onClick={actions.remove} />
      </div>
      <Eyebrow style={{ margin: "12px 0 7px" }}>{slot.poolLabel}</Eyebrow>
      <PoolChips pool={slot.pool} onRemove={actions.removeFromPool} onAdd={actions.addToPool} />
      <div style={{ borderTop: "1px solid var(--line)", marginTop: 13, paddingTop: 13 }}>
        <Eyebrow>Prescription</Eyebrow>
        <div style={{ ...TEXT.cardSubtitle, marginTop: 3 }}>
          Applies to whichever exercise rotates in
        </div>
        <SetTable block={slot.block} actions={prescription} />
      </div>
    </Card>
  );
}
