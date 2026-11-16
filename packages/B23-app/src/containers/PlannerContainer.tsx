import { useMemo } from "react";
import { MUSCLE_NAMES } from "@nabd/domain";
import { FULL_COVERAGE_SETS } from "@nabd/coverage";
import { PlannerScreen } from "@nabd/planner";
import type { PlannerCallbacks } from "@nabd/planner";
import { selectLibrary, selectPlannedVolume } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

export function PlannerContainer(): JSX.Element {
  const actions = useActions();
  const program = useNabd((s) => s.program);
  const editDayId = useNabd((s) => s.planEditDay);
  const library = useNabd(selectLibrary);
  const volume = useNabd(selectPlannedVolume);

  const volumeBars = useMemo(
    () =>
      volume.ranked().map(({ muscle, sets }) => ({
        muscle,
        name: MUSCLE_NAMES[muscle],
        sets,
        pct: Math.min(100, Math.round((sets / FULL_COVERAGE_SETS) * 100)),
      })),
    [volume],
  );
  const coverage = useMemo(() => volume.toCoverage(), [volume]);

  const callbacks = useMemo<PlannerCallbacks>(
    () => ({
      onEdit: actions.editProgram,
      onSelectDay: actions.selectPlanDay,
      onAddExercise: (dayId) => actions.openLibrary({ kind: "exercise", dayId }),
      onAddPool: (dayId, slotId) => {
        const slot = program.days.find((d) => d.id === dayId)?.slots.find((s) => s.id === slotId);
        if (slot) actions.openLibrary({ kind: "pool", dayId, slotId, muscle: slot.muscle });
      },
    }),
    [actions, program],
  );

  return (
    <PlannerScreen
      program={program}
      library={library}
      editDayId={editDayId}
      volumeBars={volumeBars}
      coverage={coverage}
      cb={callbacks}
    />
  );
}
