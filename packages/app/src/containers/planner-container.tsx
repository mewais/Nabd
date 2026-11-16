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
    () => buildPlannerVM({ program, editDayId, volume, lookup: library.lookup }),
    [program, editDayId, volume, library],
  );
  const actions = useMemo(
    (): PlannerActions => ({
      edit: store.editProgram,
      selectDay: store.selectPlanDay,
      removeDay: (dayId) => store.ask({ kind: "deleteDay", dayId }),
      addExercise: (dayId) => store.openLibrary({ kind: "exercise", dayId }),
      addPoolExercise: (dayId, slotId, muscle) =>
        store.openLibrary({ kind: "pool", dayId, slotId, muscle }),
    }),
    [store],
  );

  return <PlannerScreen vm={vm} actions={actions} />;
}
