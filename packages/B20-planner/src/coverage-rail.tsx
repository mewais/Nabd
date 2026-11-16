import { BodyMapPair } from "@nabd/bodymap";
import { Card, MeterBar } from "@nabd/design-system";
import type { RailVM } from "./view-model";

export interface CoverageRailProps {
  rail: RailVM;
}

/** What the plan trains: the body map, and sets per muscle against full weekly coverage. */
export function CoverageRail({ rail }: CoverageRailProps): JSX.Element {
  return (
    <Card
      title="Weekly coverage"
      subtitle="Sets per muscle across the plan"
      padding="18px 16px"
      style={{ width: 300, flex: "none", boxSizing: "border-box" }}
    >
      <BodyMapPair coverage={rail.coverage} />
      <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 10 }}>
        {rail.bars.map((bar) => (
          <MeterBar
            key={bar.muscle}
            label={bar.name}
            pct={bar.pct}
            value={bar.value}
            valueWidth={62}
          />
        ))}
      </div>
    </Card>
  );
}
