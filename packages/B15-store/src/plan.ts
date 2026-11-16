import { ProgramEditor } from "@nabd/program-editor";
import { dayIdAfterEdit } from "@nabd/scheduling";
import type { PlanActions } from "./actions";
import type { StoreContext } from "./context";
import { selectLibrary } from "./selectors";

export function planActions({ get, set, newId, save }: StoreContext): PlanActions {
  return {
    editProgram: (edit) => {
      const { program, dayState } = get();
      const edited = edit(new ProgramEditor(program, newId, selectLibrary(get()).lookup));
      // A floating plan stays on the day it is on, however the days around it change.
      const dayId = dayIdAfterEdit(program, edited, dayState.dayId);
      if (dayId !== dayState.dayId) save("dayState", { ...dayState, dayId });
      save("program", edited);
    },

    selectPlanDay: (dayId) => set({ planEditDay: dayId }),
  };
}
