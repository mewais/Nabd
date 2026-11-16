import { ANIMATION, Button, Card, Eyebrow, LiveDot, SHADOW, TEXT, Z } from "@nabd/design-system";
import type { ToastActions } from "./toast-actions";
import type { ToastVM } from "./toast-vm";

interface ToastProps {
  vm: ToastVM;
  actions: ToastActions;
}

/** The in-app nudge: a card in the corner naming the set that is due. */
export function Toast({ vm, actions }: ToastProps): JSX.Element {
  return (
    <Card
      padding={18}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 330,
        zIndex: Z.toast,
        boxShadow: SHADOW.toast,
        animation: ANIMATION.toast,
      }}
    >
      <div role="status">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LiveDot active />
          <Eyebrow tone="accent">{vm.title}</Eyebrow>
          <span style={{ ...TEXT.hint, marginLeft: "auto" }}>{vm.reason}</span>
        </div>
        <div style={{ ...TEXT.title, fontSize: 19 }}>{vm.exercise}</div>
        <div style={{ ...TEXT.hint, marginTop: 3 }}>{vm.detail}</div>
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 15 }}>
        <Button size="md" onClick={actions.start} style={{ flex: 1 }}>
          {"Let's go"}
        </Button>
        <Button variant="ghost" size="md" onClick={actions.snooze}>
          Snooze
        </Button>
      </div>
    </Card>
  );
}
