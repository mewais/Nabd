import { BodyMapPair, MuscleBar } from "@nabd/bodymap";
import { Card, Eyebrow, Segmented } from "@nabd/design-system";
import type { CoverageVM } from "./coverage-vm";
import { MAP_STYLE_OPTIONS, MAP_VIEW_OPTIONS } from "./options";
import type { TodayActions } from "./today-actions";

interface CoverageCardProps {
  vm: CoverageVM;
  actions: Pick<TodayActions, "setMapView" | "setMapStyle">;
}

/** The week's muscle coverage: on the body map, then muscle by muscle. */
export function CoverageCard({ vm, actions }: CoverageCardProps): JSX.Element {
  return (
    <Card padding="18px 18px 14px" title="Muscle coverage" action={<Eyebrow>7-day</Eyebrow>}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Segmented
          options={MAP_VIEW_OPTIONS}
          value={vm.view}
          onChange={actions.setMapView}
          size="sm"
          ariaLabel="Body side"
        />
        <Segmented
          options={MAP_STYLE_OPTIONS}
          value={vm.mapStyle}
          onChange={actions.setMapStyle}
          size="sm"
          ariaLabel="Map style"
        />
      </div>
      <div style={{ padding: "16px 0 6px" }}>
        <BodyMapPair coverage={vm.coverage} mapStyle={vm.mapStyle} view={vm.view} />
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
        {vm.legend.map((standing) => (
          <MuscleBar key={standing.muscle} {...standing} />
        ))}
      </div>
    </Card>
  );
}
