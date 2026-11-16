import { Card, TEXT } from "@nabd/design-system";
import type { KpiVM } from "./view-model";

/** The four headline numbers across the top of the screen. */
export function KpiStrip({ kpis }: { kpis: readonly KpiVM[] }): JSX.Element {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
      {kpis.map((kpi) => (
        <Card key={kpi.label} padding={18} style={{ minWidth: 0 }}>
          <div style={TEXT.cardSubtitle}>{kpi.label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 8 }}>
            <span style={{ ...TEXT.monoValue, fontSize: 30, letterSpacing: "-0.02em" }}>
              {kpi.value}
            </span>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>{kpi.unit}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
