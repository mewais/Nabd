import { useMemo } from "react";
import { ConfirmModal, buildConfirmVM } from "@nabd/modals";
import type { ConfirmActions } from "@nabd/modals";
import { selectLibrary } from "@nabd/store";
import { useActions, useNabd } from "../store-context";

/** The confirmation of a destructive action, while one is being asked. */
export function ConfirmContainer(): JSX.Element | null {
  const store = useActions();
  const confirmation = useNabd((s) => s.confirmation);
  const program = useNabd((s) => s.program);
  const { lookup } = useNabd(selectLibrary);

  const vm = useMemo(
    () => confirmation && buildConfirmVM({ confirmation, program, lookup }),
    [confirmation, program, lookup],
  );
  const actions = useMemo(
    (): ConfirmActions => ({
      confirm: () => void store.answer(true),
      cancel: () => void store.answer(false),
    }),
    [store],
  );

  return vm && <ConfirmModal vm={vm} actions={actions} />;
}
