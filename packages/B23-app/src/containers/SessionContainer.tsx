import { useMemo } from "react";
import { NotificationToast, SessionModal, buildSessionVM, buildToastVM } from "@nabd/modals";
import type { SessionActions, ToastActions } from "@nabd/modals";
import { selectCoach, selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The logger while a session is open; otherwise the nudge toast while a nudge is unanswered. */
export function SessionContainer(): JSX.Element | null {
  const store = useActions();
  const session = useNabd((s) => s.session);
  const plan = useNabd(selectTodayPlan);
  const coach = useNabd(selectCoach);
  const nudge = useNabd(selectNudgeStatus);
  const unit = useNabd((s) => s.settings.weightUnit);
  const now = useNabd((s) => s.now);

  const sessionVM = useMemo(
    () => session && buildSessionVM({ session, plan, coach, unit, now }),
    [session, plan, coach, unit, now],
  );
  const toastVM = useMemo(() => buildToastVM(plan.nextItem, nudge), [plan, nudge]);
  const sessionActions = useMemo(
    (): SessionActions => ({
      focusItem: store.focusItem,
      stepReps: store.stepReps,
      stepWeight: store.stepWeight,
      setReps: store.setReps,
      setWeight: store.setWeight,
      applyAdvice: store.applyAdvice,
      logSet: () => void store.logSet(),
      undoSet: (setId) => void store.undoSet(setId),
      logOther: () => store.openLibrary({ kind: "extra" }),
      close: store.closeSession,
    }),
    [store],
  );
  const toastActions = useMemo(
    (): ToastActions => ({ start: () => store.openSession(), snooze: store.snooze }),
    [store],
  );

  if (sessionVM) return <SessionModal vm={sessionVM} actions={sessionActions} />;
  return toastVM && <NotificationToast vm={toastVM} actions={toastActions} />;
}
