import type { LibraryActions } from "./actions";
import type { StoreContext } from "./context";
import { EMPTY_DRAFT, draftCopyOf, exerciseFromDraft } from "./exercise-draft";
import { addExtra } from "./logging";
import { selectLibrary } from "./selectors";
import type { LibraryState } from "./state";

export function libraryActions(ctx: StoreContext): LibraryActions {
  const { get, set, newId, save } = ctx;

  const patch = (change: Partial<LibraryState>): void =>
    set((s) => ({ library: { ...s.library, ...change } }));

  return {
    openLibrary: (target) => patch({ target }),
    closeLibrary: () => patch({ target: null, draft: null }),
    patchLibrary: patch,

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
        get().editProgram((e) => e.addToPool(target.dayId, target.slotId, exId));
        return;
      }
      if (target.kind === "exercise") {
        get().editProgram((e) => e.addExercise(target.dayId, exId));
      } else {
        get().openSession(addExtra(ctx, exId)?.id);
      }
      get().closeLibrary();
    },

    deleteCustomExercise: (exId) => {
      save(
        "customExercises",
        get().customExercises.filter((e) => e.id !== exId),
      );
      get().editProgram((e) => e.purgeExercise(exId));
    },
  };
}
