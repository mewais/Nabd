import { parseDateKey, weekdayOf } from "@nabd/domain";
import { ProgramEditor } from "@nabd/program-editor";
import { plannerDayAfterEdit, rotationAfterEdit, todayAfterEdit } from "@nabd/scheduling";
import type { StoreContext } from "./context";
import { selectLibrary, selectTodayPlan } from "./selectors";
import type { PlanSlice } from "./slices";

export function planSlice({ get, set, newId, persistTogether }: StoreContext): PlanSlice {
  return {
    editProgram: (edit) => {
      const s = get();
      const { program } = s;
      const today = parseDateKey(s.dayState.date);
      const plan = selectTodayPlan(s);
      const editor = new ProgramEditor(program, newId, selectLibrary(s).lookup, {
        weekday: weekdayOf(today),
        dayId: plan.dayId,
      });
      const edited = edit(editor);
      if (edited === program) return;
      // Today stays on the day it is on once begun (until then, on its place in the order),
      // with what it has behind it, and each pool on the exercise it was about to give.
      const from = { ...s.dayState, setsLogged: plan.setsLogged };
      const kept = todayAfterEdit(program, edited, from, today);
      const dayState = kept === from ? s.dayState : { ...s.dayState, ...kept };
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
