import { useMemo } from "react";
import { Toast, buildToastVM } from "@nabd/modals";
import type { ToastActions } from "@nabd/modals";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The nudge toast, while a set is due and the logger is not already open. */
export function ToastContainer(): JSX.Element | null {
  const store = useActions();
  const logging = useNabd((s) => s.session !== null);
  const plan = useNabd(selectTodayPlan);
  const nudge = useNabd(selectNudgeStatus);

  const vm = useMemo(
    () => (logging ? null : buildToastVM(plan.nextItem, nudge)),
    [logging, plan, nudge],
  );
  const actions = useMemo(
    (): ToastActions => ({ start: () => store.openSession(), snooze: store.snooze }),
    [store],
  );

  return vm && <Toast vm={vm} actions={actions} />;
}
