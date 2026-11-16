import type { ConfirmActions } from "./actions";
import type { StoreContext } from "./context";

/** Destructive actions wait here for the user's yes before they run. */
export function confirmActions({ get, set }: Pick<StoreContext, "get" | "set">): ConfirmActions {
  return {
    ask: (confirmation) => set({ confirmation }),

    answer: async (goAhead) => {
      const { confirmation } = get();
      set({ confirmation: null });
      if (!goAhead || confirmation === null) return;
      switch (confirmation.kind) {
        case "import":
          await get().replaceData(confirmation.data);
          break;
        case "deleteDay":
          get().editProgram((editor) => editor.removeDay(confirmation.dayId));
          break;
        case "deleteExercise":
          get().deleteCustomExercise(confirmation.exId);
          break;
      }
    },
  };
}
