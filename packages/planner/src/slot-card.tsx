import { Card, Divider, IconButton, Row, Stack, Text, TitleBlock } from "@nabd/design-system";
import type { SlotCardVM } from "./editor-vm";
import { MoveButtons } from "./move-buttons";
import type { PlannerActions } from "./planner-actions";
import { PoolChips } from "./pool-chips";
import { SetTable } from "./set-table";
import { WORDS } from "./wording";

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
    <Card variant="tile" padding="lg" ariaLabel={vm.muscleName}>
      <Stack gap="md">
        <Row gap="sm">
          <TitleBlock title={vm.muscleName} subtitle={vm.hint} grow />
          <MoveButtons onMove={(direction) => edit((e) => e.moveSlot(dayId, slotId, direction))} />
          <IconButton
            icon="close"
            variant="plain"
            ariaLabel={WORDS.removeSlot}
            onClick={() => edit((e) => e.removeSlot(dayId, slotId))}
          />
        </Row>
        <Stack gap="sm">
          <Text variant="eyebrow">{vm.poolLabel}</Text>
          <PoolChips
            vm={vm.pool}
            onRemove={(exId) => edit((e) => e.removePoolExercise(dayId, slotId, exId))}
            onAdd={() => actions.addPoolExercise(dayId, slotId, vm.muscle)}
          />
        </Stack>
        <Divider />
        <Stack gap="xxs">
          <Text variant="eyebrow">{WORDS.prescription}</Text>
          <Text variant="caption">{WORDS.prescriptionHint}</Text>
        </Stack>
        <SetTable
          vm={vm.block}
          onEdit={(change) =>
            edit((e) => e.editPrescription(dayId, { kind: "slot", id: slotId }, change))
          }
        />
      </Stack>
    </Card>
  );
}
