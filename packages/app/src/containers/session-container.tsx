import { useMemo } from "react";
import { SessionModal, buildSessionVM } from "@nabd/modals";
import type { SessionActions } from "@nabd/modals";
import { selectCoach, selectTodayPlan } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The set logger, while a session is open. */
export function SessionContainer(): JSX.Element | null {
  const store = useActions();
  const session = useNabd((s) => s.session);
  const plan = useNabd(selectTodayPlan);
  const coach = useNabd(selectCoach);
  const unit = useNabd((s) => s.settings.weightUnit);
  const now = useNabd((s) => s.now);
  const unsaved = useNabd((s) => s.unsavedSets);

  const vm = useMemo(
    () => session && buildSessionVM({ session, plan, coach, unit, now, unsaved }),
    [session, plan, coach, unit, now, unsaved],
  );
  const actions = useMemo(
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

  return vm && <SessionModal vm={vm} actions={actions} />;
}
