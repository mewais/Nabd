import { ConfirmModal, buildConfirmVM } from "@nabd/modals";
import type { ConfirmActions } from "@nabd/modals";
import type { NabdActions } from "@nabd/store";
import { selectLibrary } from "@nabd/store";
import { useNabd } from "../store-context";
import { useBoundActions, useViewModel } from "./wiring";

const bind = (store: NabdActions): ConfirmActions => ({
  confirm: () => void store.answer(true),
  cancel: () => void store.answer(false),
});

/** The confirmation of a destructive action, while one is being asked. */
export function ConfirmContainer(): JSX.Element | null {
  const confirmation = useNabd((s) => s.confirmation);
  const program = useNabd((s) => s.program);
  const { lookup } = useNabd(selectLibrary);
  const vm = useViewModel(
    (input) => input.confirmation && buildConfirmVM({ ...input, confirmation: input.confirmation }),
    { confirmation, program, lookup },
  );
  const actions = useBoundActions(bind);
  return vm && <ConfirmModal vm={vm} actions={actions} />;
}
