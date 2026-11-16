import { ANIMATION, Button, Card, Eyebrow, LiveDot, TEXT, Z } from "@nabd/design-system";
import type { ToastVM } from "./toast-vm";

export interface ToastActions {
  /** Open the logger on the set the nudge is about. */
  start: () => void;
  snooze: () => void;
}

export interface NotificationToastProps {
  vm: ToastVM;
  actions: ToastActions;
}

/** The in-app nudge: a card in the corner naming the set that is due. */
export function NotificationToast({ vm, actions }: NotificationToastProps): JSX.Element {
  return (
    <Card
      padding={18}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 330,
        zIndex: Z.toast,
        boxShadow: "0 18px 50px rgba(0,0,0,.22)",
        animation: ANIMATION.toast,
      }}
    >
      <div role="status">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LiveDot active />
          <Eyebrow tone="accent">Time to move</Eyebrow>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)" }}>
            {vm.reason}
          </span>
        </div>
        <div style={{ ...TEXT.title, fontSize: 19 }}>{vm.exercise}</div>
        <div style={{ fontSize: 12.5, color: "var(--text3)", marginTop: 3 }}>{vm.detail}</div>
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
