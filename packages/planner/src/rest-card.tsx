import { Button, Card, Spacer, Stack, Text } from "@nabd/design-system";
import type { RestColumnVM } from "./board-vm";
import type { PlannerActions } from "./planner-actions";

interface RestCardProps {
  vm: RestColumnVM;
  actions: Pick<PlannerActions, "edit">;
}

/** A weekday with no training day yet. */
export function RestCard({ vm, actions }: RestCardProps): JSX.Element {
  return (
    <Card variant="tile" padding="md">
      <Stack gap="xs">
        <Text variant="eyebrow">{vm.label}</Text>
        <Text variant="label" tone="faint">
          Rest
        </Text>
      </Stack>
      <Spacer />
      <Button
        variant="add"
        size="sm"
        block
        ariaLabel={vm.addLabel}
        onClick={() => actions.edit((e) => e.addDay(vm.weekday))}
      >
        + Add day
      </Button>
    </Card>
  );
}
