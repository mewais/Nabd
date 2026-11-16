import { RECOMMENDATION_TONES } from "@nabd/bodymap";
import { Swatch, TEXT, toneColor } from "@nabd/design-system";
import type { InsightRowVM } from "./coverage-vm";

interface InsightRowProps {
  vm: InsightRowVM;
}

/** One finding: a dot in the colour of its kind and a sentence with a bold opening. */
export function InsightRow({ vm }: InsightRowProps): JSX.Element {
  return (
    <div style={{ ...TEXT.body, display: "flex", gap: 11, alignItems: "flex-start" }}>
      <div style={{ display: "flex", height: "1.5em", alignItems: "center" }}>
        <Swatch color={toneColor(RECOMMENDATION_TONES[vm.kind]) ?? "var(--text3)"} size={9} />
      </div>
      <div>
        <b>{vm.lead}</b>
        {vm.text}
      </div>
    </div>
  );
}
