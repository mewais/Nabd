import { Button, NextSetBlock, TEXT } from "@nabd/design-system";
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
    <div style={{ flex: 1, minWidth: 0, padding: "20px 22px", overflowY: "auto" }}>
      <NextSetBlock
        variant="form"
        exercise={vm.set.exercise}
        line={vm.setLine}
        muscleNames={vm.set.muscleNames}
        notes={vm.set.notes}
        advice={vm.set.advice}
        onApplyAdvice={actions.applyAdvice}
      />
      <div style={{ display: "flex", gap: 12, margin: "16px 0 14px" }}>
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
      </div>
      <Button block onClick={actions.logSet}>
        Log this set
      </Button>
      {vm.restLabel !== null && (
        <div
          role="timer"
          style={{
            ...TEXT.monoValue,
            marginTop: 10,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 400,
            color: "var(--accent2)",
          }}
        >
          {vm.restLabel}
        </div>
      )}
      <LoggedSets vm={vm.logged} actions={actions} />
    </div>
  );
}
