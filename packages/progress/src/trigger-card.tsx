import { Card, EmptyNote, RADIUS, Swatch, TEXT } from "@nabd/design-system";
import type { Trigger } from "@nabd/domain";
import { isEmpty } from "./view-model";
import type { ProgressVM, TriggerShareVM } from "./view-model";

const TRIGGER_COLORS: Record<Trigger, string> = {
  idle: "var(--accent)",
  timer: "var(--accent2)",
  manual: "var(--accent3)",
};

function TriggerSplit({ shares }: { shares: readonly TriggerShareVM[] }): JSX.Element {
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 2,
          height: 34,
          margin: "4px 0 18px",
          borderRadius: RADIUS.chip,
          overflow: "hidden",
        }}
      >
        {shares.map(({ trigger, pct }) => (
          <div key={trigger} style={{ width: `${pct}%`, background: TRIGGER_COLORS[trigger] }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: "auto" }}>
        {shares.map(({ trigger, label, share }) => (
          <div key={trigger} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Swatch shape="square" color={TRIGGER_COLORS[trigger]} size={11} />
            <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
            <span style={{ ...TEXT.monoValue, fontSize: 13 }}>{share}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** What prompted the logged sets: an idle moment, the timer, or the user. */
export function TriggerCard({ triggers }: { triggers: ProgressVM["triggers"] }): JSX.Element {
  return (
    <Card title="What prompts a set" subtitle="Idle detection vs timer vs manual" stacked>
      {isEmpty(triggers) ? (
        <EmptyNote>{triggers.empty}</EmptyNote>
      ) : (
        <TriggerSplit shares={triggers} />
      )}
    </Card>
  );
}
