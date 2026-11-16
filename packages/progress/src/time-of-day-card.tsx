import { BarChart, Card, Chip, EmptyNote } from "@nabd/design-system";
import { isEmpty } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import type { TimeOfDayVM } from "./time-of-day-vm";
import { WORDS } from "./wording";

interface TimeOfDayCardProps {
  vm: TimeOfDayVM | EmptyVM;
}

/** Sets by hour of the day, with the busiest hour called out. */
export function TimeOfDayCard({ vm }: TimeOfDayCardProps): JSX.Element {
  const empty = isEmpty(vm);
  return (
    <Card
      title={WORDS.timeOfDay}
      subtitle={WORDS.timeOfDayHint}
      action={empty ? undefined : <Chip>{vm.peak}</Chip>}
    >
      {empty ? (
        <EmptyNote>{vm.empty}</EmptyNote>
      ) : (
        <BarChart bars={vm.bars} tone="accent" ariaLabel={WORDS.setsByHour} />
      )}
    </Card>
  );
}
