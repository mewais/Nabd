import { Card, Eyebrow, IconButton, TEXT } from "@nabd/design-system";
import type { SlotCardVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import type { PlannerActions } from "./planner-actions";
import { PoolChips } from "./pool-chips";
import { SetTable } from "./set-table";

interface SlotCardProps {
  vm: SlotCardVM;
  dayId: string;
  actions: Pick<PlannerActions, "edit" | "addPoolExercise">;
}

/** One muscle of a cycled day: its exercise pool and the prescription they share. */
export function SlotCard({ vm, dayId, actions }: SlotCardProps): JSX.Element {
  const { edit } = actions;
  const slotId = vm.id;
  return (
    <section aria-label={vm.muscleName}>
      <Card variant="tile" padding={15}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={TEXT.cardTitle}>{vm.muscleName}</div>
            <div style={{ ...TEXT.cardSubtitle, marginTop: 2 }}>{vm.hint}</div>
          </div>
          <MoveButtons onMove={(direction) => edit((e) => e.moveSlot(dayId, slotId, direction))} />
          <IconButton
            icon="close"
            variant="plain"
            ariaLabel="Remove slot"
            onClick={() => edit((e) => e.removeSlot(dayId, slotId))}
          />
        </div>
        <Eyebrow style={{ margin: "12px 0 7px" }}>{vm.poolLabel}</Eyebrow>
        <PoolChips
          vm={vm.pool}
          onRemove={(exId) => edit((e) => e.removePoolExercise(dayId, slotId, exId))}
          onAdd={() => actions.addPoolExercise(dayId, slotId, vm.muscle)}
        />
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 13, paddingTop: 13 }}>
          <Eyebrow>Prescription</Eyebrow>
          <div style={{ ...TEXT.cardSubtitle, marginTop: 3 }}>
            Applies to whichever exercise rotates in
          </div>
          <SetTable
            vm={vm.block}
            onEdit={(change) =>
              edit((e) => e.editPrescription(dayId, { kind: "slot", id: slotId }, change))
            }
          />
        </div>
      </Card>
    </section>
  );
}
