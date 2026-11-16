import { ConfirmDialog } from "@nabd/design-system";
import type { ConfirmActions } from "./confirm-actions";
import type { ConfirmVM } from "./confirm-vm";

export interface ConfirmModalProps {
  vm: ConfirmVM;
  actions: ConfirmActions;
}

/** The question asked before something that cannot be undone. */
export function ConfirmModal({ vm, actions }: ConfirmModalProps): JSX.Element {
  return (
    <ConfirmDialog
      title={vm.title}
      confirmLabel={vm.confirmLabel}
      onConfirm={actions.confirm}
      onCancel={actions.cancel}
    >
      {vm.text}
    </ConfirmDialog>
  );
}
