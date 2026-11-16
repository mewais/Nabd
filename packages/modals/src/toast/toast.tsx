import { Button, LiveDot, Row, Spacer, Stack, Text, ToastFrame } from "@nabd/design-system";
import type { ToastActions } from "./toast-actions";
import type { ToastVM } from "./toast-vm";
import { WORDS } from "../wording";

interface ToastProps {
  vm: ToastVM;
  actions: ToastActions;
}

/** The in-app nudge: a card in the corner naming the set that is due. */
export function Toast({ vm, actions }: ToastProps): JSX.Element {
  return (
    <ToastFrame>
      <Stack gap="lg">
        <Stack role="status" gap="sm">
          <Row gap="sm">
            <LiveDot on />
            <Text variant="eyebrow" tone="accent">
              {vm.title}
            </Text>
            <Spacer />
            <Text as="span" variant="hint">
              {vm.reason}
            </Text>
          </Row>
          <Stack gap="xxs">
            <Text variant="heading">{vm.exercise}</Text>
            <Text variant="hint">{vm.detail}</Text>
          </Stack>
        </Stack>
        <Row gap="sm">
          <Button size="md" onClick={actions.start} grow>
            {WORDS.letsGo}
          </Button>
          <Button variant="ghost" size="md" onClick={actions.snooze}>
            {WORDS.snooze}
          </Button>
        </Row>
      </Stack>
    </ToastFrame>
  );
}
