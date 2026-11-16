import type { CSSProperties } from "react";
import type { Coverage } from "@nabd/domain";
import { COLOR } from "@nabd/design-system";
import type { MapStyle, MapView } from "@nabd/view";
import { BACK_MUSCLES, FRONT_MUSCLES, VIEWBOX } from "./drawing";
import { regionCoverage } from "./regions";
import { bodyLabel, regionLabel } from "./wording";

/** One side of the body: a map view that shows a single drawing. */
export type BodySide = Exclude<MapView, "both">;

interface BodyMapProps {
  side: BodySide;
  coverage: Coverage;
  mapStyle?: MapStyle;
}

const BODY_PARTS = { front: FRONT_MUSCLES, back: BACK_MUSCLES };
const WIDTH = 124;
const NEUTRAL: CSSProperties = { fill: COLOR.mapMuscle };

/** An untrained region stays neutral; a trained one moves toward the accent with its coverage. */
function regionPaint(pct: number, mapStyle: MapStyle): CSSProperties {
  if (pct <= 0) return NEUTRAL;
  const share = pct / 100;
  return mapStyle === "heat"
    ? { fill: COLOR.accent, fillOpacity: 0.34 + 0.66 * share }
    : { ...NEUTRAL, stroke: COLOR.accent, strokeOpacity: 0.2 + 0.8 * share };
}

/** One side of the body, each region tinted by how covered its muscles are. */
export function BodyMap({ side, coverage, mapStyle = "heat" }: BodyMapProps): JSX.Element {
  return (
    <svg
      viewBox={VIEWBOX[side]}
      width={WIDTH}
      role="img"
      aria-label={bodyLabel(side)}
      data-map-style={mapStyle}
    >
      {BODY_PARTS[side].map((part) => {
        const region = regionCoverage(part.slug, coverage);
        const paint = region === null ? NEUTRAL : regionPaint(region.pct, mapStyle);
        const outlines = Object.values(part.path).flat();
        return (
          <g
            key={part.slug}
            data-region={part.slug}
            data-coverage={region === null ? undefined : Math.round(region.pct)}
            // eslint-disable-next-line no-restricted-syntax -- an SVG region's paint is computed from its coverage
            style={paint}
          >
            {region !== null && <title>{regionLabel(region.muscles, region.pct)}</title>}
            {outlines.map((d, index) => (
              <path key={index} d={d} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
