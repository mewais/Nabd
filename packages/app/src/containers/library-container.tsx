import { useMemo } from "react";
import { LibraryModal, buildLibraryVM } from "@nabd/modals";
import type { LibraryActions } from "@nabd/modals";
import { selectLibrary } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The exercise library, while it is open. */
export function LibraryContainer(): JSX.Element | null {
  const store = useActions();
  const state = useNabd((s) => s.library);
  const library = useNabd(selectLibrary);
  const owned = useNabd((s) => s.settings.equipment);

  const vm = useMemo(() => buildLibraryVM(state, library, owned), [state, library, owned]);
  const actions = useMemo(
    (): LibraryActions => ({
      close: store.closeLibrary,
      filter: store.patchLibrary,
      pick: store.pickExercise,
      startDraft: store.startDraft,
      patchDraft: store.patchDraft,
      cancelDraft: store.cancelDraft,
      saveDraft: store.saveDraft,
      deleteCustom: store.deleteCustomExercise,
    }),
    [store],
  );

  return vm && <LibraryModal vm={vm} actions={actions} />;
}
