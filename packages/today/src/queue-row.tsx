import { Button, FONT, Swatch, TEXT } from "@nabd/design-system";
import type { QueueRowVM } from "./queue-vm";
import type { TodayActions } from "./today-actions";

interface QueueRowProps {
  vm: QueueRowVM;
  actions: Pick<TodayActions, "start" | "toggleSkip">;
}

type RowState = QueueRowVM["state"];

const DOT_COLOR: Record<RowState, string> = {
  next: "var(--accent)",
  pending: "var(--text3)",
  done: "var(--accent2)",
  skipped: "var(--line)",
};

const BADGE_COLOR: Record<RowState, string> = {
  next: "var(--accent)",
  pending: "var(--text3)",
  done: "var(--accent2)",
  skipped: "var(--text3)",
};

/** One exercise of the day: where it stands and what can be done with it. */
export function QueueRow({ vm, actions }: QueueRowProps): JSX.Element {
  const { state } = vm;
  return (
    <li
      aria-label={vm.exercise}
      data-state={state}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 20px",
        borderTop: "1px solid var(--line)",
        opacity: state === "skipped" ? 0.55 : 1,
      }}
    >
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: 12.5,
          color: "var(--text3)",
          width: 26,
          flex: "none",
        }}
      >
        {vm.marker}
      </span>
      <Swatch color={DOT_COLOR[state]} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TEXT.label, color: state === "next" ? "var(--text)" : "var(--text2)" }}>
          {vm.exercise}
        </div>
        <div style={{ ...TEXT.cardSubtitle, marginTop: 1 }}>{vm.sub}</div>
      </div>
      <span
        style={{ fontFamily: FONT.mono, fontSize: 12, color: BADGE_COLOR[state], flex: "none" }}
      >
        {vm.badge}
      </span>
      {vm.skipLabel !== null && (
        <Button variant="ghost" size="sm" onClick={() => actions.toggleSkip(vm.id)}>
          {vm.skipLabel}
        </Button>
      )}
      {vm.startLabel !== null && (
        <Button variant="ghost" size="sm" tone="accent" onClick={() => actions.start(vm.id)}>
          {vm.startLabel}
        </Button>
      )}
    </li>
  );
}
