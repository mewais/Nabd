import { BodyMapPair, MuscleBar } from "@nabd/bodymap";
import { Card, Columns, EmptyNote, Grid } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { HeatmapVM } from "./progress-vm";

interface HeatmapCardProps {
  vm: HeatmapVM;
}

/** The body maps at their own width, then the meters in whatever is left. */
const COLUMNS = "auto minmax(0, 1fr)";
/** The narrowest a column of meters stays readable, in px. */
const METER_COLUMN = 260;

/** Last week's training on the body map, with a meter per trained muscle. */
export function HeatmapCard({ vm }: HeatmapCardProps): JSX.Element {
  const { coverage, muscles } = vm;
  return (
    <Card title="Sets per muscle" subtitle="7-day coverage">
      <Grid columns={COLUMNS} gap="xxl" align="center">
        <BodyMapPair coverage={coverage} />
        {isEmpty(muscles) ? (
          <EmptyNote>{muscles.empty}</EmptyNote>
        ) : (
          <Columns minWidth={METER_COLUMN} gap="xxl">
            {muscles.map((standing) => (
              <MuscleBar key={standing.muscle} {...standing} />
            ))}
          </Columns>
        )}
      </Grid>
    </Card>
  );
}
