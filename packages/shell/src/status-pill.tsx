import { FONT, LiveDot, RADIUS, SURFACE2_BOX } from "@nabd/design-system";
import type { StatusVM } from "./shell-vm";

interface StatusPillProps {
  vm: StatusVM;
}

/** The clock and where nudging stands; it lights up while a set is due. */
export function StatusPill({ vm }: StatusPillProps): JSX.Element {
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
        <LiveDot active={vm.due} />
        {vm.clock}
      </span>
      <span style={{ width: 1, height: 14, background: "var(--line)" }} />
      <span style={{ color: vm.due ? "var(--accent)" : "var(--text3)" }}>{vm.line}</span>
    </div>
  );
}
