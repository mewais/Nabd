import { ModalShell } from "@nabd/design-system";
import { ExerciseForm } from "./exercise-form";
import type { LibraryActions } from "./library-actions";
import { LibraryBrowser } from "./library-browser";
import type { LibraryVM } from "./library-vm";

export interface LibraryModalProps {
  vm: LibraryVM;
  actions: LibraryActions;
}

/** The exercise library: browse and pick an exercise, or create a custom one. */
export function LibraryModal({ vm, actions }: LibraryModalProps): JSX.Element {
  return (
    <ModalShell title={vm.title} onClose={actions.close} width={560} height={680} layer="modalOver">
      {vm.mode === "browse" ? (
        <LibraryBrowser browser={vm.browser} actions={actions} />
      ) : (
        <ExerciseForm form={vm.form} actions={actions} />
      )}
    </ModalShell>
  );
}
