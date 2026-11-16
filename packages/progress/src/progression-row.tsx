import type { CSSProperties } from "react";
import { Chip, Icon, RowButton, Sparkline, TEXT } from "@nabd/design-system";
import type { ProgressActions } from "./progress-actions";
import type { ProgressionRowVM } from "./progress-vm";

/** The table's columns: exercise, trend, best, gain, chevron. */
export const PROGRESSION_COLUMNS: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.3fr 1.5fr 132px 132px 16px",
  gap: 14,
  alignItems: "center",
};

interface ProgressionRowProps {
  vm: ProgressionRowVM;
  actions: Pick<ProgressActions, "openChart">;
}

/** One exercise: its trend line, personal best and gain. Pressing it opens the full history. */
export function ProgressionRow({ vm, actions }: ProgressionRowProps): JSX.Element {
  return (
    <RowButton
      onClick={() => actions.openChart(vm.exId)}
      style={{ ...PROGRESSION_COLUMNS, padding: "13px 2px", borderTop: "1px solid var(--line)" }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{vm.exercise}</span>
      <Sparkline series={vm.series} />
      <span
        style={{
          ...TEXT.monoValue,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 5,
          fontSize: 12.5,
        }}
      >
        <Icon name="trophy" size={12} stroke="var(--accent)" />
        {vm.best}
      </span>
      <Chip variant="box" tone={vm.up ? "success" : "neutral"}>
        {vm.gain}
      </Chip>
      <Icon name="chevron-right" size={14} stroke="var(--text3)" />
    </RowButton>
  );
}
