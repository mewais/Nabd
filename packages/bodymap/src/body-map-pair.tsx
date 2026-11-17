import type { Coverage } from "@nabd/domain";
import { Row, Stack, Text } from "@nabd/design-system";
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
    <Row justify="center" gap="lg">
      {SIDES.filter((side) => view === "both" || view === side).map((side) => (
        <Stack key={side} align="center" gap="sm">
          <Text variant="eyebrow">{side}</Text>
          <BodyMap side={side} coverage={coverage} mapStyle={mapStyle} />
        </Stack>
      ))}
    </Row>
  );
}
