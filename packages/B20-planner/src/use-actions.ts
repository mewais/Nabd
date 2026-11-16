// The planner's actions, provided once by PlannerScreen and handed to each
// component already bound to the day, exercise or slot it edits.

import { createContext, useContext, useMemo } from "react";
import type { MuscleKey } from "@nabd/domain";
import type { EditRef } from "@nabd/program-editor";
import {
  dayActions,
  exerciseActions,
  prescriptionActions,
  programActions,
  slotActions,
} from "./actions";
import type {
  DayActions,
  ExerciseActions,
  PlannerActions,
  PrescriptionActions,
  ProgramActions,
} from "./actions";

const ActionsContext = createContext<PlannerActions | null>(null);

export const PlannerActionsProvider = ActionsContext.Provider;

function usePlannerActions(): PlannerActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("planner components need a PlannerActionsProvider");
  return actions;
}

export function useProgramActions(): ProgramActions {
  const actions = usePlannerActions();
  return useMemo(() => programActions(actions), [actions]);
}

export function useDayActions(dayId: string): DayActions {
  const actions = usePlannerActions();
  return useMemo(() => dayActions(actions, dayId), [actions, dayId]);
}

export function useExerciseActions(dayId: string, rowId: string): ExerciseActions {
  const actions = usePlannerActions();
  return useMemo(() => exerciseActions(actions, dayId, rowId), [actions, dayId, rowId]);
}

export function useSlotActions(dayId: string, slotId: string, muscle: MuscleKey) {
  const actions = usePlannerActions();
  return useMemo(
    () => slotActions(actions, dayId, { id: slotId, muscle }),
    [actions, dayId, slotId, muscle],
  );
}

export function usePrescriptionActions(
  dayId: string,
  kind: EditRef["kind"],
  id: string,
): PrescriptionActions {
  const actions = usePlannerActions();
  return useMemo(
    () => prescriptionActions(actions, dayId, { kind, id }),
    [actions, dayId, kind, id],
  );
}
