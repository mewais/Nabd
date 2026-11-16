import { BarChart, Card, EmptyNote, Eyebrow, TEXT } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { CompletionVM } from "./stats-vm";

interface CompletionCardProps {
  vm: CompletionVM | EmptyVM;
}

/** The share of planned sets that got done: this week, and day by day. */
export function CompletionCard({ vm }: CompletionCardProps): JSX.Element {
  return (
    <Card title="Completion rate" subtitle="Planned sets actually done" stacked>
      {isEmpty(vm) ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "2px 0 4px" }}>
            <span
              style={{
                ...TEXT.monoValue,
                fontSize: 42,
                letterSpacing: "-0.03em",
                color: "var(--accent)",
              }}
            >
              {vm.weekPct}
            </span>
            <span style={TEXT.hint}>this week</span>
          </div>
          <div style={{ marginTop: "auto" }}>
            <Eyebrow style={{ marginBottom: 10 }}>Last 7 days</Eyebrow>
            <BarChart bars={vm.days} height={88} tone="success" ariaLabel="Completion by day" />
          </div>
        </>
      )}
    </Card>
  );
}
