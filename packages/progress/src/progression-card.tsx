import { Card, EmptyNote, TEXT } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { ProgressActions } from "./progress-actions";
import type { ProgressionRowVM } from "./progress-vm";
import { PROGRESSION_COLUMNS, ProgressionRow } from "./progression-row";

interface ProgressionCardProps {
  vm: ProgressionRowVM[] | EmptyVM;
  actions: Pick<ProgressActions, "openChart">;
}

/** Every exercise with history: trend, personal best and gain since the first session. */
export function ProgressionCard({ vm, actions }: ProgressionCardProps): JSX.Element {
  const empty = isEmpty(vm);
  return (
    <Card
      title="Progression & records"
      subtitle={`Trend & personal best${empty ? "" : " · click a row for full history"}`}
    >
      {empty ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <>
          <div style={{ ...PROGRESSION_COLUMNS, ...TEXT.eyebrow, padding: "0 2px 8px" }}>
            <span>Exercise</span>
            <span>Trend</span>
            <span style={{ textAlign: "right" }}>Best</span>
            <span>Gain</span>
          </div>
          {vm.map((row) => (
            <ProgressionRow key={row.exId} vm={row} actions={actions} />
          ))}
        </>
      )}
    </Card>
  );
}
