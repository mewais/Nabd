import { describeNudge } from "@nabd/nudge";
import { NotificationToast, SessionModal, buildSessionVM } from "@nabd/modals";
import { selectCoach, selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The logger while a session is open; otherwise the nudge toast while a nudge is unanswered. */
export function SessionContainer(): JSX.Element | null {
  const actions = useActions();
  const session = useNabd((s) => s.session);
  const plan = useNabd(selectTodayPlan);
  const coach = useNabd(selectCoach);
  const nudge = useNabd(selectNudgeStatus);
  const unit = useNabd((s) => s.settings.weightUnit);
  const now = useNabd((s) => s.now);

  const vm = session && buildSessionVM({ session, plan, coach, unit, now });
  if (vm) {
    return (
      <SessionModal
        vm={vm}
        onPick={actions.focusItem}
        onStepReps={actions.stepReps}
        onStepWeight={actions.stepWeight}
        onSetReps={actions.setReps}
        onSetWeight={actions.setWeight}
        onApplyAdvice={actions.applyAdvice}
        onLog={() => void actions.logSet()}
        onUndo={(setId) => void actions.undoSet(setId)}
        onLogOther={() => actions.openLibrary({ kind: "extra" })}
        onClose={actions.closeSession}
      />
    );
  }

  const next = plan.nextItem;
  if (nudge.state !== "due" || next === null) return null;
  return (
    <NotificationToast
      reasonLabel={describeNudge(nudge)}
      exercise={next.exercise.name}
      sub={`${next.label} · set ${next.done + 1} of ${next.planned}`}
      onConfirm={() => actions.openSession()}
      onSnooze={actions.snooze}
    />
  );
}
