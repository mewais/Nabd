import type { Coverage } from "@nabd/domain";
import { Eyebrow } from "@nabd/design-system";
import type { MapStyle, MapView } from "@nabd/view";
import { BodyMap } from "./body-map";
import type { BodySide } from "./body-map";

interface BodyMapPairProps {
  coverage: Coverage;
  mapStyle?: MapStyle;
  view?: MapView;
}

const SIDES: readonly BodySide[] = ["front", "back"];

/** The front and back body maps side by side, each under its label. */
export function BodyMapPair({ coverage, mapStyle, view = "both" }: BodyMapPairProps): JSX.Element {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
      {SIDES.filter((side) => view === "both" || view === side).map((side) => (
        <div
          key={side}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
        >
          <Eyebrow>{side}</Eyebrow>
          <BodyMap side={side} coverage={coverage} mapStyle={mapStyle} />
        </div>
      ))}
    </div>
  );
}
