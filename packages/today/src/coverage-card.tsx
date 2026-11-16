import { BodyMapPair, MuscleBar } from "@nabd/bodymap";
import type { MapStyle, MapView } from "@nabd/domain";
import { Card, Eyebrow, Segmented } from "@nabd/design-system";
import type { SegOption } from "@nabd/design-system";
import type { CoverageVM } from "./coverage-vm";

const VIEW_OPTIONS: readonly SegOption<MapView>[] = [
  { value: "both", label: "Both" },
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
];

const STYLE_OPTIONS: readonly SegOption<MapStyle>[] = [
  { value: "heat", label: "Heat" },
  { value: "outline", label: "Outline" },
];

interface CoverageCardProps {
  vm: CoverageVM;
  onMapView: (view: MapView) => void;
  onMapStyle: (style: MapStyle) => void;
}

/** The week's muscle coverage: on the body map, then muscle by muscle. */
export function CoverageCard({ vm, onMapView, onMapStyle }: CoverageCardProps): JSX.Element {
  return (
    <Card padding="18px 18px 14px" title="Muscle coverage" action={<Eyebrow>7-day</Eyebrow>}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Segmented
          options={VIEW_OPTIONS}
          value={vm.view}
          onChange={onMapView}
          size="sm"
          ariaLabel="Body side"
        />
        <Segmented
          options={STYLE_OPTIONS}
          value={vm.mapStyle}
          onChange={onMapStyle}
          size="sm"
          ariaLabel="Map style"
        />
      </div>
      <div style={{ padding: "16px 0 6px" }}>
        <BodyMapPair coverage={vm.coverage} mapStyle={vm.mapStyle} view={vm.view} />
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
        {vm.legend.map((row) => (
          <MuscleBar
            key={row.muscle}
            muscle={row.muscle}
            pct={row.pct}
            recommendation={row.recommendation}
          />
        ))}
      </div>
    </Card>
  );
}
