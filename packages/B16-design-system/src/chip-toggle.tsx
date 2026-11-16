import type { ReactNode } from "react";
import { RADIUS, tint } from "./tokens";

export interface ChipToggleProps {
  active: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/** A chip that is on or off (a filter, a muscle, a piece of equipment). */
export function ChipToggle({ active, onToggle, children }: ChipToggleProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      style={{
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: "inherit",
        padding: "5px 12px",
        borderRadius: RADIUS.chip,
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? tint("var(--accent)", 15) : "var(--surface2)",
        color: active ? "var(--accent)" : "var(--text2)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
