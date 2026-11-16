import { AdviceCard, Button, Chip, TEXT } from "@nabd/design-system";
import { LoggedSets } from "./logged-sets";
import type { SessionActions } from "./session-actions";
import type { SetFormVM } from "./session-vm";
import { StepperCard } from "./stepper-card";

interface SetFormProps {
  form: SetFormVM;
  actions: SessionActions;
}

/** The logger's right pane: one set of one exercise, and what has been logged of it today. */
export function SetForm({ form, actions }: SetFormProps): JSX.Element {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: "20px 22px", overflowY: "auto" }}>
      <h3 style={{ ...TEXT.title, fontSize: 24, margin: 0 }}>{form.exercise}</h3>
      <div
        style={{
          ...TEXT.monoValue,
          fontSize: 12.5,
          fontWeight: 400,
          color: "var(--accent)",
          marginTop: 4,
        }}
      >
        {form.setLine}
      </div>
      {form.notes !== "" && <div style={{ ...TEXT.note, marginTop: 6 }}>{form.notes}</div>}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "13px 0 16px" }}>
        {form.muscleNames.map((name) => (
          <Chip key={name}>{name}</Chip>
        ))}
      </div>
      {form.advice !== null && <AdviceCard advice={form.advice} onApply={actions.applyAdvice} />}
      <div style={{ display: "flex", gap: 12, margin: "16px 0 14px" }}>
        <StepperCard
          label={form.repsLabel}
          value={form.reps}
          onStep={actions.stepReps}
          onSet={actions.setReps}
          onEnter={actions.logSet}
        />
        {form.weight !== null && (
          <StepperCard
            label={form.weightLabel}
            value={form.weight}
            onStep={actions.stepWeight}
            onSet={actions.setWeight}
            onEnter={actions.logSet}
          />
        )}
      </div>
      <Button block onClick={actions.logSet}>
        Log this set
      </Button>
      {form.restLabel !== null && (
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
          {form.restLabel}
        </div>
      )}
      <LoggedSets sets={form.logged} onUndo={actions.undoSet} />
    </div>
  );
}
