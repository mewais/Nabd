import { BarChart, Card, Chip, EmptyNote } from "@nabd/design-system";
import { isEmpty } from "./view-model";
import type { ProgressVM } from "./view-model";

/** Sets by hour of the day, with the busiest hour called out. */
export function TimeOfDayCard({ timeOfDay }: { timeOfDay: ProgressVM["timeOfDay"] }): JSX.Element {
  const title = "Time of day";
  const subtitle = "When you fit sets into the workday";
  if (isEmpty(timeOfDay)) {
    return (
      <Card title={title} subtitle={subtitle}>
        <EmptyNote>{timeOfDay.empty}</EmptyNote>
      </Card>
    );
  }
  return (
    <Card title={title} subtitle={subtitle} action={<Chip>{timeOfDay.peak}</Chip>}>
      <BarChart bars={timeOfDay.bars} height={124} tone="accent" ariaLabel="Sets by hour" />
    </Card>
  );
}
