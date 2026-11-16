import { useMemo } from "react";
import { LibraryModal, buildLibraryVM } from "@nabd/modals";
import type { Program } from "@nabd/domain";
import type { LibraryActions, LibraryPurpose } from "@nabd/modals";
import { selectLibrary } from "@nabd/store";
import type { LibraryTarget } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** What the library is open for, with the pool a pool target adds to. */
function purposeOf(target: LibraryTarget | null, program: Program): LibraryPurpose | null {
  if (target?.kind !== "pool") return target;
  const slots = program.days.find((day) => day.id === target.dayId)?.slots ?? [];
  const pool = slots.find((slot) => slot.id === target.slotId)?.pool ?? [];
  return { kind: "pool", muscle: target.muscle, pool };
}

/** The exercise library, while it is open. */
export function LibraryContainer(): JSX.Element | null {
  const store = useActions();
  const state = useNabd((s) => s.library);
  const program = useNabd((s) => s.program);
  const library = useNabd(selectLibrary);
  const owned = useNabd((s) => s.settings.equipment);

  const vm = useMemo(
    () => buildLibraryVM({ ...state, target: purposeOf(state.target, program) }, library, owned),
    [state, program, library, owned],
  );
  const actions = useMemo(
    (): LibraryActions => ({
      close: store.closeLibrary,
      filter: store.patchLibrary,
      pick: store.pickExercise,
      startDraft: store.startDraft,
      patchDraft: store.patchDraft,
      cancelDraft: store.cancelDraft,
      saveDraft: store.saveDraft,
      deleteCustom: (exId) => store.ask({ kind: "deleteExercise", exId }),
    }),
    [store],
  );

  return vm && <LibraryModal vm={vm} actions={actions} />;
}
