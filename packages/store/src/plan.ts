import { parseDateKey } from "@nabd/domain";
import { ProgramEditor } from "@nabd/program-editor";
import {
  carriedAfterEdit,
  dayIdAfterEdit,
  plannerDayAfterEdit,
  rotationAfterEdit,
} from "@nabd/scheduling";
import type { StoreContext } from "./context";
import { selectLibrary, selectTodayPlan } from "./selectors";
import type { PlanSlice } from "./slices";

export function planSlice({ get, set, newId, persistTogether }: StoreContext): PlanSlice {
  return {
    editProgram: (edit) => {
      const s = get();
      const { program } = s;
      const today = parseDateKey(s.dayState.date);
      const editor = new ProgramEditor(program, newId, selectLibrary(s).lookup, {
        weekday: today.getDay(),
        dayId: selectTodayPlan(s).dayId,
      });
      const edited = edit(editor);
      if (edited === program) return;
      // Today stays on the day it is on, with what it has behind it, and each pool on the
      // exercise it was about to give.
      const dayId = dayIdAfterEdit(program, edited, s.dayState.dayId, today);
      const carried = carriedAfterEdit(edited, dayId, s.dayState.carried);
      const same = dayId === s.dayState.dayId && carried === s.dayState.carried;
      const dayState = same ? s.dayState : { ...s.dayState, dayId, carried };
      const rotationState = rotationAfterEdit(program, edited, s.rotationState);
      // One change of state, so nothing ever sees the new plan with the old day.
      set({
        program: edited,
        dayState,
        rotationState,
        plannerDayId: plannerDayAfterEdit(program, edited, s.plannerDayId),
      });
      persistTogether("your plan", {
        program: edited,
        ...(dayState === s.dayState ? {} : { dayState }),
        ...(rotationState === s.rotationState ? {} : { rotationState }),
      });
    },

    selectPlannerDay: (plannerDayId) => set({ plannerDayId }),
  };
}
