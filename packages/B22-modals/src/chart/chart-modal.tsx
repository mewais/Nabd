import { LineChart, ModalShell, RADIUS, SURFACE2_BOX, TEXT } from "@nabd/design-system";
import type { ChartVM } from "./chart-vm";
import { StatTile } from "./stat-tile";

export interface ChartModalProps {
  vm: ChartVM;
  onClose: () => void;
}

/** One exercise's whole history: its headline figures over a line chart. */
export function FullHistoryChartModal({ vm, onClose }: ChartModalProps): JSX.Element {
  return (
    <ModalShell
      eyebrow="Full history"
      title={vm.exercise}
      subtitle={vm.subtitle}
      onClose={onClose}
      width={760}
      layer="modalOver"
    >
      <div style={{ padding: "18px 22px 22px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {vm.stats.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
        <div
          style={{
            ...SURFACE2_BOX,
            marginTop: 18,
            borderRadius: RADIUS.tile,
            padding: "16px 12px 8px",
          }}
        >
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
        </div>
      </div>
    </ModalShell>
  );
}
