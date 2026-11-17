import { PlannerScreen, buildPlannerVM } from "@nabd/planner";
import type { PlannerActions } from "@nabd/planner";
import type { NabdActions } from "@nabd/store";
import { selectLibrary, selectPlannedVolume } from "@nabd/store";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): PlannerActions => ({
  edit: store.editProgram,
  selectDay: store.selectPlannerDay,
  removeDay: (dayId) => store.ask({ kind: "deleteDay", dayId }),
  addExercise: (dayId) => store.openLibrary({ kind: "exercise", dayId }),
  addPoolExercise: (dayId, slotId, muscle) =>
    store.openLibrary({ kind: "pool", dayId, slotId, muscle }),
});

/** The Plan screen. */
export function PlannerContainer(): JSX.Element {
  const program = useNabd((s) => s.program);
  const plannerDayId = useNabd((s) => s.plannerDayId);
  const { lookup } = useNabd(selectLibrary);
  const volume = useNabd(selectPlannedVolume);
  const vm = useViewModel(buildPlannerVM, { program, plannerDayId, volume, lookup });
  const actions = useBoundActions(bind);
  return <PlannerScreen vm={vm} actions={actions} />;
}
