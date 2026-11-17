import { BodyMapPair, MuscleBar } from "@nabd/bodymap";
import { Card, Divider, Row, Segmented, Stack, Text } from "@nabd/design-system";
import type { CoverageVM } from "./coverage-vm";
import { MAP_STYLE_OPTIONS, MAP_VIEW_OPTIONS } from "./options";
import type { TodayActions } from "./today-actions";
import { WORDS } from "./wording";

interface CoverageCardProps {
  vm: CoverageVM;
  actions: Pick<TodayActions, "setMapView" | "setMapStyle">;
}

/** The week's muscle coverage: on the body map, then muscle by muscle. */
export function CoverageCard({ vm, actions }: CoverageCardProps): JSX.Element {
  return (
    <Card title={WORDS.coverage} action={<Text variant="eyebrow">{WORDS.coverageSpan}</Text>}>
      <Stack gap="lg">
        <Row gap="sm" wrap>
          <Segmented
            options={MAP_VIEW_OPTIONS}
            value={vm.view}
            onChange={actions.setMapView}
            size="sm"
            ariaLabel={WORDS.bodySide}
          />
          <Segmented
            options={MAP_STYLE_OPTIONS}
            value={vm.mapStyle}
            onChange={actions.setMapStyle}
            size="sm"
            ariaLabel={WORDS.mapStyle}
          />
        </Row>
        <BodyMapPair coverage={vm.coverage} mapStyle={vm.mapStyle} view={vm.view} />
        <Divider />
        <div>
          {vm.legend.map((standing) => (
            <MuscleBar key={standing.muscle} {...standing} />
          ))}
        </div>
      </Stack>
    </Card>
  );
}
