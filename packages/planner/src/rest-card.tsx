import { Button, Card, Eyebrow, TEXT } from "@nabd/design-system";
import type { RestColumnVM } from "./board-vm";
import type { PlannerActions } from "./planner-actions";

interface RestCardProps {
  vm: RestColumnVM;
  actions: Pick<PlannerActions, "edit">;
}

/** A weekday with no training day yet. */
export function RestCard({ vm, actions }: RestCardProps): JSX.Element {
  return (
    <Card
      variant="tile"
      padding={11}
      style={{
        minHeight: 150,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Eyebrow>{vm.label}</Eyebrow>
      <div style={{ ...TEXT.label, color: "var(--text3)", margin: "5px 0 auto" }}>Rest</div>
      <Button
        variant="ghost"
        size="sm"
        dashed
        block
        ariaLabel={vm.addLabel}
        onClick={() => actions.edit((e) => e.addDay(vm.weekday))}
      >
        + Add day
      </Button>
    </Card>
  );
}
