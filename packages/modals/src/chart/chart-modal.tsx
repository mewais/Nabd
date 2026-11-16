import { Card, LineChart, ModalShell, StatTile, TEXT } from "@nabd/design-system";
import type { ChartActions } from "./chart-actions";
import type { ChartVM } from "./chart-vm";

export interface ChartModalProps {
  vm: ChartVM;
  actions: ChartActions;
}

/** One exercise's whole history: its headline figures over a line chart. */
export function ChartModal({ vm, actions }: ChartModalProps): JSX.Element {
  return (
    <ModalShell
      eyebrow="Full history"
      title={vm.exercise}
      subtitle={vm.subtitle}
      onClose={actions.close}
      width={760}
      layer="modalOver"
    >
      <div style={{ padding: "18px 22px 22px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {vm.stats.map((stat) => (
            <StatTile key={stat.label} variant="inset" {...stat} />
          ))}
        </div>
        <Card variant="inset" padding="16px 12px 8px" style={{ marginTop: 18 }}>
          <LineChart series={vm.series} ariaLabel={vm.chartLabel} />
          <div
            style={{
              ...TEXT.monoValue,
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 8px 2px",
              fontSize: 11,
              fontWeight: 400,
              color: "var(--text3)",
            }}
          >
            <span>{vm.startLabel}</span>
            <span>{vm.endLabel}</span>
          </div>
        </Card>
      </div>
    </ModalShell>
  );
}
