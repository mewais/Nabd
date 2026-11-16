import type { CSSProperties } from "react";
import { COLOR, Icon, RADIUS, RowButton, TEXT, tint } from "@nabd/design-system";
import type { SessionListRow } from "./session-vm";

const CLIPPED: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const MARK_SIZE = 18;

function rowStyle(row: SessionListRow): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 9,
    boxSizing: "border-box",
    padding: "9px 10px",
    borderRadius: RADIUS.field,
    background: row.active ? tint("var(--accent)", 12) : "transparent",
    border: `1px solid ${row.active ? tint("var(--accent)", 30) : "transparent"}`,
    opacity: row.skipped ? 0.5 : 1,
  };
}

interface ExerciseRowProps {
  row: SessionListRow;
  onPick: (itemId: string) => void;
}

/** One of today's exercises in the logger's list; pressing it switches the form to it. */
export function ExerciseRow({ row, onPick }: ExerciseRowProps): JSX.Element {
  return (
    <RowButton current={row.active} onClick={() => onPick(row.itemId)} style={rowStyle(row)}>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          boxSizing: "border-box",
          width: MARK_SIZE,
          height: MARK_SIZE,
          borderRadius: "50%",
          background: row.complete ? "var(--accent2)" : "var(--surface)",
          border: row.complete ? "none" : "1px solid var(--line)",
        }}
      >
        {row.complete && (
          <Icon name="check" size={12} strokeWidth={3.4} stroke={COLOR.onAccent} label="complete" />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            ...CLIPPED,
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: row.active ? "var(--accent)" : "var(--text)",
          }}
        >
          {row.exercise}
        </span>
        <span style={{ ...CLIPPED, display: "block", fontSize: 11, color: "var(--text3)" }}>
          {row.detail}
        </span>
      </span>
      <span
        style={{
          ...TEXT.monoValue,
          flex: "none",
          fontSize: 11,
          fontWeight: 400,
          color: row.complete ? "var(--accent2)" : "var(--text3)",
        }}
      >
        {row.progress}
      </span>
    </RowButton>
  );
}
