import { useMemo } from "react";
import { PlannerScreen, buildPlannerVM } from "@nabd/planner";
import type { PlannerActions } from "@nabd/planner";
import { selectLibrary, selectPlannedVolume } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

export function PlannerContainer(): JSX.Element {
  const store = useActions();
  const program = useNabd((s) => s.program);
  const editDayId = useNabd((s) => s.planEditDay);
  const library = useNabd(selectLibrary);
  const volume = useNabd(selectPlannedVolume);

  const vm = useMemo(
    () => buildPlannerVM({ program, editDayId, volume, lookup: (exId) => library.byId(exId) }),
    [program, editDayId, volume, library],
  );
  const actions = useMemo<PlannerActions>(
    () => ({
      onEdit: store.editProgram,
      onSelectDay: store.selectPlanDay,
      onAddExercise: (dayId) => store.openLibrary({ kind: "exercise", dayId }),
      onAddToPool: (dayId, slotId, muscle) =>
        store.openLibrary({ kind: "pool", dayId, slotId, muscle }),
    }),
    [store],
  );

  return <PlannerScreen vm={vm} actions={actions} />;
}
