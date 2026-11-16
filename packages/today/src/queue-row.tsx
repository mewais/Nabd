import { Button, FONT, Swatch, TEXT } from "@nabd/design-system";
import type { QueueRowVM } from "./queue-vm";

interface QueueRowProps {
  row: QueueRowVM;
  onStart: (itemId: string) => void;
  onToggleSkip: (itemId: string) => void;
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
export function QueueRow({ row, onStart, onToggleSkip }: QueueRowProps): JSX.Element {
  const { state } = row;
  return (
    <div
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
        {row.marker}
      </span>
      <Swatch color={DOT_COLOR[state]} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TEXT.label, color: state === "next" ? "var(--text)" : "var(--text2)" }}>
          {row.exercise}
        </div>
        <div style={{ ...TEXT.cardSubtitle, marginTop: 1 }}>{row.sub}</div>
      </div>
      <span
        style={{ fontFamily: FONT.mono, fontSize: 12, color: BADGE_COLOR[state], flex: "none" }}
      >
        {row.badge}
      </span>
      {row.skipLabel !== null && (
        <Button variant="ghost" size="sm" onClick={() => onToggleSkip(row.id)}>
          {row.skipLabel}
        </Button>
      )}
      {row.startLabel !== null && (
        <Button variant="ghost" size="sm" tone="accent" onClick={() => onStart(row.id)}>
          {row.startLabel}
        </Button>
      )}
    </div>
  );
}
