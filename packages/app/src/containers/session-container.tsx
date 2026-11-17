import { SessionModal, buildSessionVM } from "@nabd/modals";
import type { SessionActions } from "@nabd/modals";
import type { NabdActions } from "@nabd/store";
import { selectCoach, selectTodayPlan } from "@nabd/store";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): SessionActions => ({
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
});

/** The set logger, while a session is open. */
export function SessionContainer(): JSX.Element | null {
  const session = useNabd((s) => s.session);
  const plan = useNabd(selectTodayPlan);
  const coach = useNabd(selectCoach);
  const unit = useNabd((s) => s.settings.weightUnit);
  const now = useNabd((s) => s.now);
  const unsaved = useNabd((s) => s.unsavedSets);
  const vm = useViewModel(
    (input) => input.session && buildSessionVM({ ...input, session: input.session }),
    { session, plan, coach, unit, now, unsaved },
  );
  const actions = useBoundActions(bind);
  return vm && <SessionModal vm={vm} actions={actions} />;
}
