import { Button, Card, Eyebrow, NextSetBlock, TEXT } from "@nabd/design-system";
import type { NextSetVM } from "./hero-vm";
import type { TodayActions } from "./today-actions";

interface NextSetCardProps {
  vm: NextSetVM;
  actions: Pick<TodayActions, "start" | "snooze" | "logOther">;
}

/** The next set: the exercise, what the plan and the coach ask for, and the ways to act on it. */
export function NextSetCard({ vm, actions }: NextSetCardProps): JSX.Element {
  return (
    <Card
      ariaLabel="Next set"
      padding={24}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow tone="accent">{vm.kicker}</Eyebrow>
        <span style={TEXT.hint}>{vm.label}</span>
      </div>
      <NextSetBlock
        exercise={vm.set.exercise}
        line={vm.set.target}
        muscleNames={vm.set.muscleNames}
        notes={vm.set.notes}
        advice={vm.set.advice}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={() => actions.start()}>Start set</Button>
        {vm.nudge.due && (
          <Button variant="ghost" onClick={actions.snooze}>
            {vm.snoozeLabel}
          </Button>
        )}
        <Button variant="ghost" onClick={actions.logOther}>
          Log something else
        </Button>
        <span style={{ ...TEXT.hint, color: vm.nudge.due ? "var(--accent)" : TEXT.hint.color }}>
          {vm.nudge.line}
        </span>
      </div>
    </Card>
  );
}
