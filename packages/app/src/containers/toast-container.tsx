import { Toast, buildToastVM } from "@nabd/modals";
import type { ToastActions } from "@nabd/modals";
import type { NabdActions } from "@nabd/store";
import { selectNudgeStatus, selectTodayPlan } from "@nabd/store";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): ToastActions => ({
  start: () => store.openSession(),
  snooze: store.snooze,
  skipToday: store.toggleSkipToday,
});

/** The nudge toast, while a set is due and the logger is not already open. */
export function ToastContainer(): JSX.Element | null {
  const logging = useNabd((s) => s.session !== null);
  const plan = useNabd(selectTodayPlan);
  const nudge = useNabd(selectNudgeStatus);
  const vm = useViewModel(
    (input) => (input.logging ? null : buildToastVM(input.plan.nextItem, input.nudge)),
    { logging, plan, nudge },
  );
  const actions = useBoundActions(bind);
  return vm && <Toast vm={vm} actions={actions} />;
}
