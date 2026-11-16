import { Card, EmptyNote } from "@nabd/design-system";
import type { InsightRowVM } from "./coverage-vm";
import { InsightRow } from "./insight-row";

/** Which muscles to rest and which to push, from the week's coverage. */
export function InsightCard({ rows }: { rows: InsightRowVM[] }): JSX.Element {
  return (
    <Card padding={18} title="Volume insight">
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {rows.length === 0 && (
          <EmptyNote>Nothing stands out yet — log a few sets and this fills in.</EmptyNote>
        )}
        {rows.map((row) => (
          <InsightRow key={row.kind} row={row} />
        ))}
      </div>
    </Card>
  );
}
