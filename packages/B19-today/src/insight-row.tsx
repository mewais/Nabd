import type { InsightRowVM } from "./coverage-vm";

const DOT_COLOR: Record<InsightRowVM["kind"], string> = {
  rest: "var(--accent3)",
  push: "var(--accent)",
};

/** One finding: a dot in the colour of its kind and a sentence with a bold opening. */
export function InsightRow({ row }: { row: InsightRowVM }): JSX.Element {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: DOT_COLOR[row.kind],
          flex: "none",
          marginTop: 4,
        }}
      />
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        <b>{row.lead}</b>
        {row.text}
      </div>
    </div>
  );
}
