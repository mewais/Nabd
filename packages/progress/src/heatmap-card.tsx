import { BodyMapPair, MuscleBar } from "@nabd/bodymap";
import { Card, Columns, EmptyNote, Grid } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { HeatmapVM } from "./progress-vm";
import { WORDS } from "./wording";

interface HeatmapCardProps {
  vm: HeatmapVM;
}

/** Last week's training on the body maps, at their own width, with a meter per trained muscle in whatever is left. */
export function HeatmapCard({ vm }: HeatmapCardProps): JSX.Element {
  const { coverage, muscles } = vm;
  return (
    <Card title={WORDS.heatmap} subtitle={WORDS.heatmapHint}>
      <Grid columns={["fit", 1]} gap="xxl" align="center">
        <BodyMapPair coverage={coverage} />
        {isEmpty(muscles) ? (
          <EmptyNote>{muscles.empty}</EmptyNote>
        ) : (
          <Columns minWidth="meters" gap="xxl">
            {muscles.map((standing) => (
              <MuscleBar key={standing.muscle} {...standing} />
            ))}
          </Columns>
        )}
      </Grid>
    </Card>
  );
}
