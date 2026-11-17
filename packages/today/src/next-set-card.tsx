import { Button, Card, NextSetBlock, Row, Stack, Text } from "@nabd/design-system";
import type { NextSetVM } from "./hero-vm";
import type { TodayActions } from "./today-actions";
import { WORDS } from "./wording";

interface NextSetCardProps {
  vm: NextSetVM;
  actions: Pick<TodayActions, "start" | "snooze" | "logOther">;
}

/** The next set: the exercise, what the plan and the coach ask for, and the ways to act on it. */
export function NextSetCard({ vm, actions }: NextSetCardProps): JSX.Element {
  return (
    <Card ariaLabel={WORDS.nextSet} padding="xxl">
      <Stack gap="lg">
        <Row justify="between" gap="md">
          <Text variant="eyebrow" tone="accent">
            {vm.kicker}
          </Text>
          <Text variant="hint">{vm.label}</Text>
        </Row>
        <NextSetBlock
          exercise={vm.set.exercise}
          line={vm.set.target}
          muscleNames={vm.set.muscleNames}
          notes={vm.set.notes}
          advice={vm.set.advice}
        />
        <Row gap="sm" wrap>
          <Button onClick={() => actions.start()}>{WORDS.startSet}</Button>
          {vm.nudge.due && (
            <Button variant="ghost" onClick={actions.snooze}>
              {vm.snoozeLabel}
            </Button>
          )}
          <Button variant="ghost" onClick={actions.logOther}>
            {WORDS.logSomethingElse}
          </Button>
          <Text variant="hint" tone={vm.nudge.due ? "accent" : "neutral"}>
            {vm.nudge.line}
          </Text>
        </Row>
      </Stack>
    </Card>
  );
}
