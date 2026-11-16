import { BodyMapPair, MuscleBar } from "@nabd/bodymap";
import { Card, EmptyNote } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { HeatmapVM } from "./progress-vm";

interface HeatmapCardProps {
  vm: HeatmapVM;
}

/** Last week's training on the body map, with a meter per trained muscle. */
export function HeatmapCard({ vm }: HeatmapCardProps): JSX.Element {
  const { coverage, muscles } = vm;
  return (
    <Card title="Sets per muscle" subtitle="7-day coverage">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 26 }}>
        <BodyMapPair coverage={coverage} />
        <div style={{ flex: 1, minWidth: 260 }}>
          {isEmpty(muscles) ? (
            <EmptyNote>{muscles.empty}</EmptyNote>
          ) : (
            <div style={{ columnWidth: 260, columnGap: 26 }}>
              {muscles.map((standing) => (
                <MuscleBar key={standing.muscle} {...standing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
