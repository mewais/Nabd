import { FONT, LiveDot, RADIUS, SURFACE2_BOX } from "@nabd/design-system";
import type { StatusVM } from "./view-model";

export interface StatusPillProps {
  status: StatusVM;
}

/** The clock and where nudging stands; it lights up while a set is due. */
export function StatusPill({ status }: StatusPillProps): JSX.Element {
  return (
    <div
      role="status"
      style={{
        ...SURFACE2_BOX,
        display: "flex",
        alignItems: "center",
        gap: 13,
        borderRadius: RADIUS.button,
        padding: "8px 15px",
        fontFamily: FONT.mono,
        fontSize: 12.5,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <LiveDot active={status.due} />
        {status.clock}
      </span>
      <span style={{ width: 1, height: 14, background: "var(--line)" }} />
      <span style={{ color: status.due ? "var(--accent)" : "var(--text3)" }}>{status.line}</span>
    </div>
  );
}
