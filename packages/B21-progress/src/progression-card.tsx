import { Card, EmptyNote, TEXT } from "@nabd/design-system";
import { PROGRESSION_COLUMNS, ProgressionRow } from "./progression-row";
import { isEmpty } from "./view-model";
import type { ProgressVM } from "./view-model";

export interface ProgressionCardProps {
  progression: ProgressVM["progression"];
  onOpenChart: (exId: string) => void;
}

/** Every exercise with history: trend, personal best and gain since the first session. */
export function ProgressionCard({ progression, onOpenChart }: ProgressionCardProps): JSX.Element {
  const empty = isEmpty(progression);
  return (
    <Card
      title="Progression & records"
      subtitle={`Trend & personal best${empty ? "" : " · click a row for full history"}`}
    >
      {isEmpty(progression) ? (
        <EmptyNote>{progression.empty}</EmptyNote>
      ) : (
        <>
          <div style={{ ...PROGRESSION_COLUMNS, ...TEXT.eyebrow, padding: "0 2px 8px" }}>
            <span>Exercise</span>
            <span>Trend</span>
            <span style={{ textAlign: "right" }}>Best</span>
            <span>Gain</span>
          </div>
          {progression.map((row) => (
            <ProgressionRow key={row.exId} row={row} onOpen={onOpenChart} />
          ))}
        </>
      )}
    </Card>
  );
}
