import { BodyMapPair } from "@nabd/bodymap";
import { Card, Divider, MeterBar, Stack } from "@nabd/design-system";
import type { RailVM } from "./planner-vm";
import { WORDS } from "./wording";

interface CoverageRailProps {
  vm: RailVM;
}

/** What the plan trains: the body map, and sets per muscle against full weekly coverage. */
export function CoverageRail({ vm }: CoverageRailProps): JSX.Element {
  return (
    <Card title={WORDS.coverage} subtitle={WORDS.coverageHint} padding="lg">
      <Stack gap="md">
        <BodyMapPair coverage={vm.coverage} />
        <Divider />
        <div>
          {vm.bars.map((bar) => (
            <MeterBar
              key={bar.muscle}
              label={bar.name}
              pct={bar.pct}
              value={bar.value}
              valueWidth="md"
            />
          ))}
        </div>
      </Stack>
    </Card>
  );
}
