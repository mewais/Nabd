import { Card, EmptyNote, RADIUS, Swatch, TEXT } from "@nabd/design-system";
import type { Trigger } from "@nabd/domain";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { TriggerShareVM } from "./stats-vm";

const TRIGGER_COLORS: Record<Trigger, string> = {
  idle: "var(--accent)",
  timer: "var(--accent2)",
  manual: "var(--accent3)",
};

interface TriggerSplitProps {
  vm: readonly TriggerShareVM[];
}

/** The triggers as one split bar, and what each colour stands for. */
function TriggerSplit({ vm }: TriggerSplitProps): JSX.Element {
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
        {vm.map(({ trigger, pct }) => (
          <div key={trigger} style={{ width: `${pct}%`, background: TRIGGER_COLORS[trigger] }} />
        ))}
      </div>
      <ul
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
          margin: "auto 0 0",
          padding: 0,
          listStyle: "none",
        }}
      >
        {vm.map(({ trigger, label, share }) => (
          <li
            key={trigger}
            aria-label={label}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <Swatch shape="square" color={TRIGGER_COLORS[trigger]} size={11} />
            <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
            <span style={{ ...TEXT.monoValue, fontSize: 13 }}>{share}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

interface TriggerCardProps {
  vm: TriggerShareVM[] | EmptyVM;
}

/** What prompted the logged sets: an idle moment, the timer, or the user. */
export function TriggerCard({ vm }: TriggerCardProps): JSX.Element {
  return (
    <Card title="What prompts a set" subtitle="Idle detection vs timer vs manual" stacked>
      {isEmpty(vm) ? <EmptyNote>{vm.empty}</EmptyNote> : <TriggerSplit vm={vm} />}
    </Card>
  );
}
