import { BarChart, Card, EmptyNote, Eyebrow, TEXT } from "@nabd/design-system";
import { STACKED_CARD } from "./styles";
import { isEmpty } from "./view-model";
import type { CompletionVM, ProgressVM } from "./view-model";

function CompletionChart({ weekPct, days }: CompletionVM): JSX.Element {
  return (
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
          {weekPct}
        </span>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>this week</span>
      </div>
      <div style={{ marginTop: "auto" }}>
        <Eyebrow style={{ marginBottom: 10 }}>Last 7 days</Eyebrow>
        <BarChart bars={days} height={88} tone="success" ariaLabel="Completion by day" />
      </div>
    </>
  );
}

/** The share of planned sets that got done: this week, and day by day. */
export function CompletionCard({
  completion,
}: {
  completion: ProgressVM["completion"];
}): JSX.Element {
  return (
    <Card title="Completion rate" subtitle="Planned sets actually done" style={STACKED_CARD}>
      {isEmpty(completion) ? (
        <EmptyNote>{completion.empty}</EmptyNote>
      ) : (
        <CompletionChart {...completion} />
      )}
    </Card>
  );
}
