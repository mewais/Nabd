import { BarChart, Card, Chip, EmptyNote } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { TimeOfDayVM } from "./stats-vm";

interface TimeOfDayCardProps {
  vm: TimeOfDayVM | EmptyVM;
}

/** Sets by hour of the day, with the busiest hour called out. */
export function TimeOfDayCard({ vm }: TimeOfDayCardProps): JSX.Element {
  const empty = isEmpty(vm);
  return (
    <Card
      title="Time of day"
      subtitle="When you fit sets into the workday"
      action={empty ? undefined : <Chip>{vm.peak}</Chip>}
    >
      {empty ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <BarChart bars={vm.bars} height={124} tone="accent" ariaLabel="Sets by hour" />
      )}
    </Card>
  );
}
