import { Button, NextSetBlock, Row, ScrollArea, Stack, Text } from "@nabd/design-system";
import { LoggedSets } from "./logged-sets";
import type { SessionActions } from "./session-actions";
import type { SetFormVM } from "./session-vm";
import { StepperCard } from "./stepper-card";

interface SetFormProps {
  vm: SetFormVM;
  actions: SessionActions;
}

/** The logger's right pane: one set of one exercise, and what has been logged of it today. */
export function SetForm({ vm, actions }: SetFormProps): JSX.Element {
  return (
    <ScrollArea paddingX="xxl" paddingY="xl">
      <Stack gap="lg">
        <NextSetBlock
          variant="form"
          exercise={vm.set.exercise}
          line={vm.setLine}
          muscleNames={vm.set.muscleNames}
          notes={vm.set.notes}
          advice={vm.set.advice}
          onApplyAdvice={actions.applyAdvice}
        />
        <Row gap="md" align="stretch">
          <StepperCard
            label={vm.repsLabel}
            value={vm.reps}
            onStep={actions.stepReps}
            onSet={actions.setReps}
            onEnter={actions.logSet}
          />
          {vm.weight !== null && (
            <StepperCard
              label={vm.weightLabel}
              value={vm.weight}
              onStep={actions.stepWeight}
              onSet={actions.setWeight}
              onEnter={actions.logSet}
            />
          )}
        </Row>
        <Stack gap="sm">
          <Button block onClick={actions.logSet}>
            Log this set
          </Button>
          {vm.restLabel !== null && (
            <Text role="timer" variant="mono" tone="success" align="center">
              {vm.restLabel}
            </Text>
          )}
        </Stack>
        <LoggedSets vm={vm.logged} actions={actions} />
      </Stack>
    </ScrollArea>
  );
}
