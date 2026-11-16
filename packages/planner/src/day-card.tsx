import { CardButton, Chip, Stack, Text } from "@nabd/design-system";
import type { DayColumnVM } from "./board-vm";
import type { PlannerActions } from "./planner-actions";

interface DayCardProps {
  vm: DayColumnVM;
  actions: Pick<PlannerActions, "selectDay">;
}

/** A training day on the board: pick it to edit it. */
export function DayCard({ vm, actions }: DayCardProps): JSX.Element {
  return (
    <CardButton selected={vm.selected} onClick={() => actions.selectDay(vm.dayId)}>
      <Stack as="span" gap="sm">
        <Stack as="span" gap="xs">
          <Text as="span" variant="eyebrow">
            {vm.label}
          </Text>
          <Text as="span" variant="cardTitle">
            {vm.name}
          </Text>
        </Stack>
        <Stack as="span" gap="xs">
          {vm.chips.map((chip, index) => (
            <Chip key={index} variant="box" tone={chip.superset ? "success" : "neutral"}>
              {chip.name}
            </Chip>
          ))}
          {vm.overflow !== null && (
            <Text as="span" variant="caption">
              {vm.overflow}
            </Text>
          )}
        </Stack>
      </Stack>
    </CardButton>
  );
}
