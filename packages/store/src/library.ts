import { EMPTY_DRAFT, draftCopyOf, exerciseFromDraft } from "@nabd/domain";
import type { LibraryState } from "@nabd/view";
import type { StoreContext } from "./context";
import { selectLibrary } from "./selectors";
import type { LibrarySlice } from "./slices";

export function librarySlice({ get, set, newId, save }: StoreContext): LibrarySlice {
  const patch = (change: Partial<LibraryState>): void =>
    set((s) => ({ library: { ...s.library, ...change } }));

  return {
    openLibrary: (target) => patch({ target, search: "", group: null, draft: null }),
    closeLibrary: () => patch({ target: null, draft: null }),
    filterLibrary: patch,

    startDraft: (copyOf) => {
      const source = copyOf === undefined ? undefined : selectLibrary(get()).byId(copyOf);
      patch({ draft: source ? draftCopyOf(source) : EMPTY_DRAFT });
    },

    patchDraft: (change) => {
      const { draft } = get().library;
      if (draft) patch({ draft: { ...draft, ...change } });
    },

    cancelDraft: () => patch({ draft: null }),

    saveDraft: () => {
      const { library, customExercises } = get();
      const exercise = library.draft && exerciseFromDraft(library.draft, newId());
      if (!exercise) return;
      save("customExercises", [...customExercises, exercise]);
      patch({ draft: null });
    },

    pickExercise: (exId) => {
      const { target } = get().library;
      if (target === null) return;
      if (target.kind === "pool") {
        // Stay open: a pool usually takes several exercises.
        get().editProgram((e) => e.addPoolExercise(target.dayId, target.slotId, exId));
        return;
      }
      if (target.kind === "exercise") get().editProgram((e) => e.addExercise(target.dayId, exId));
      else get().openSessionOn(exId);
      get().closeLibrary();
    },

    // Out of the plan first: the plan must never name an exercise the library has lost.
    deleteCustomExercise: (exId) => {
      get().editProgram((e) => e.purgeExercise(exId));
      save(
        "customExercises",
        get().customExercises.filter((e) => e.id !== exId),
      );
    },
  };
}
