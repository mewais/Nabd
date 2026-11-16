import type { ReactNode } from "react";
import { Button } from "./button";
import { ModalShell } from "./modal-shell";

interface ConfirmDialogProps {
  /** The question: "Delete Push?". */
  title: string;
  /** What saying yes does, and what it leaves alone. */
  children: ReactNode;
  /** The words on the button that goes ahead: "Delete day". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Also what Escape, the close button and a click outside do. */
  onCancel: () => void;
}

const WIDTH = 420;

/**
 * Asks before something that cannot be undone. It opens over every other
 * dialog, and nothing happens unless the confirm button is pressed.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  return (
    <ModalShell title={title} onClose={onCancel} width={WIDTH} layer="confirm">
      <div style={{ padding: "16px 22px 20px" }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text2)" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button tone="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
