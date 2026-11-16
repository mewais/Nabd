import { useMemo } from "react";
import { LibraryModal, buildLibraryVM } from "@nabd/modals";
import { selectLibrary } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

export function LibraryContainer(): JSX.Element | null {
  const actions = useActions();
  const state = useNabd((s) => s.library);
  const library = useNabd(selectLibrary);
  const owned = useNabd((s) => s.settings.equipment);

  const vm = useMemo(() => buildLibraryVM(state, library, owned), [state, library, owned]);
  return vm && <LibraryModal vm={vm} actions={actions} />;
}
