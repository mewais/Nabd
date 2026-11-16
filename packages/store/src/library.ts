import { EMPTY_DRAFT, draftCopyOf, exerciseFromDraft } from "@nabd/domain";
import type { LibraryActions } from "./actions";
import type { StoreContext } from "./context";
import { addExtra } from "./logging";
import type { PlanItem } from "@nabd/scheduling";
import { selectLibrary, selectTodayPlan } from "./selectors";
import type { LibraryState } from "./state";

export function libraryActions(ctx: StoreContext): LibraryActions {
  const { get, set, newId, save } = ctx;

  const patch = (change: Partial<LibraryState>): void =>
    set((s) => ({ library: { ...s.library, ...change } }));

  /**
   * Where "log something else" logs `exId`: the item today already has for
   * that exercise (brought back if it was skipped), so its sets count toward
   * the plan instead of beside it; a new extra only when today has none.
   */
  function itemToLog(exId: string): PlanItem | undefined {
    const existing = selectTodayPlan(get()).items.find((item) => item.exercise.id === exId);
    if (!existing) return addExtra(ctx, exId);
    if (existing.skipped) get().toggleSkip(existing.id);
    return existing;
  }

  return {
    openLibrary: (target) => patch({ target, search: "", group: null, draft: null }),
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
        get().editProgram((e) => e.addPoolExercise(target.dayId, target.slotId, exId));
        return;
      }
      if (target.kind === "exercise") {
        get().editProgram((e) => e.addExercise(target.dayId, exId));
      } else {
        get().openSession(itemToLog(exId)?.id);
      }
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
