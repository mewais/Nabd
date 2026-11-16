import type { ReactNode } from "react";
import { Button } from "./button";
import { ModalShell } from "./modal-shell";
import { Row } from "./row";
import { Stack } from "./stack";
import { Text } from "./text";
import { WORDS } from "./wording";

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
    <ModalShell title={title} onClose={onCancel} width="sm" layer="confirm">
      <Stack gap="xl" paddingX="xxl" paddingY="xl">
        <Text tone="muted">{children}</Text>
        <Row justify="end" gap="sm">
          <Button variant="ghost" onClick={onCancel}>
            {WORDS.cancel}
          </Button>
          <Button tone="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Row>
      </Stack>
    </ModalShell>
  );
}
