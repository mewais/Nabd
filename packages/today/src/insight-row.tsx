import { Swatch, TEXT } from "@nabd/design-system";
import type { InsightRowVM } from "./coverage-vm";

const DOT_COLOR: Record<InsightRowVM["kind"], string> = {
  rest: "var(--accent3)",
  push: "var(--accent)",
};

/** One finding: a dot in the colour of its kind and a sentence with a bold opening. */
export function InsightRow({ row }: { row: InsightRowVM }): JSX.Element {
  return (
    <div style={{ ...TEXT.body, display: "flex", gap: 11, alignItems: "flex-start" }}>
      <div style={{ display: "flex", height: "1.5em", alignItems: "center" }}>
        <Swatch color={DOT_COLOR[row.kind]} size={9} />
      </div>
      <div>
        <b>{row.lead}</b>
        {row.text}
      </div>
    </div>
  );
}
