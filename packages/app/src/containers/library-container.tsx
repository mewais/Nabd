import type { Program } from "@nabd/domain";
import { LibraryModal, buildLibraryVM } from "@nabd/modals";
import type { LibraryActions } from "@nabd/modals";
import type { NabdActions } from "@nabd/store";
import { selectLibrary } from "@nabd/store";
import type { LibraryTarget } from "@nabd/view";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

/** What the pool `target` adds to holds so far; empty for any other target. */
function poolOf(target: LibraryTarget | null, program: Program): readonly string[] {
  if (target?.kind !== "pool") return [];
  const slots = program.days.find((day) => day.id === target.dayId)?.slots ?? [];
  return slots.find((slot) => slot.id === target.slotId)?.pool ?? [];
}

const bind = (store: NabdActions): LibraryActions => ({
  close: store.closeLibrary,
  filter: store.filterLibrary,
  pick: store.pickExercise,
  startDraft: store.startDraft,
  patchDraft: store.patchDraft,
  cancelDraft: store.cancelDraft,
  saveDraft: store.saveDraft,
  deleteCustom: (exId) => store.ask({ kind: "deleteExercise", exId }),
});

/** The exercise library, while it is open. */
export function LibraryContainer(): JSX.Element | null {
  const state = useNabd((s) => s.library);
  const program = useNabd((s) => s.program);
  const library = useNabd(selectLibrary);
  const owned = useNabd((s) => s.settings.equipment);
  const vm = useViewModel(
    (input) => buildLibraryVM({ ...input, pool: poolOf(input.state.target, input.program) }),
    { state, program, library, owned },
  );
  const actions = useBoundActions(bind);
  return vm && <LibraryModal vm={vm} actions={actions} />;
}
